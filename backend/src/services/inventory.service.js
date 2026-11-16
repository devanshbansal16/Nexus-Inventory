const mongoose = require('mongoose');
const { Inventory, InventoryTransaction, Product, OutboxEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitInventoryUpdate } = require('../sockets/socketHandler');

class InventoryService {
  /**
   * Helper to execute in a transaction if replica set supports it, otherwise atomic execution
   */
  async withTransaction(work) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      // If transactions are not supported by the mongo deployment (e.g. standalone local mongo without replica set),
      // run the work without session
      if (err.message && err.message.includes('Transactions are not supported')) {
        session.endSession();
        return await work(null);
      }
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate total aggregated stock across all warehouses for a given product
   */
  async getTotalStock(productId) {
    const records = await Inventory.find({ productId });
    const totals = records.reduce(
      (acc, cur) => {
        acc.physicalStock += cur.physicalStock;
        acc.reservedStock += cur.reservedStock;
        acc.damagedStock += cur.damagedStock;
        acc.inTransitStock += cur.inTransitStock;
        acc.availableStock += cur.availableStock;
        return acc;
      },
      { physicalStock: 0, reservedStock: 0, damagedStock: 0, inTransitStock: 0, availableStock: 0 }
    );
    return totals;
  }

  /**
   * Reserve stock atomically for an order.
   * Prevents two concurrent orders from reserving the same last unit.
   */
  async reserveStock({ productId, warehouseId, quantity, referenceId = '', performedBy = null }) {
    if (quantity <= 0) {
      throw new ApiError(400, 'Reservation quantity must be greater than 0');
    }

    return await this.withTransaction(async (session) => {
      // Atomic conditional update: only succeed if availableStock >= quantity
      // Formula: availableStock = physicalStock - reservedStock - damagedStock
      // So availableStock >= quantity is equivalent to: (physicalStock - reservedStock - damagedStock) >= quantity
      const opts = session ? { session, new: true } : { new: true };

      // Find current state to record previous stock
      const current = await Inventory.findOne({ productId, warehouseId });
      if (!current) {
        throw new ApiError(404, 'Inventory record not found for specified product and warehouse');
      }

      if (current.availableStock < quantity) {
        throw new ApiError(
          409,
          `Insufficient stock in selected warehouse. Available: ${current.availableStock}, Requested: ${quantity}`
        );
      }

      // Atomic update matching current availableStock
      const updated = await Inventory.findOneAndUpdate(
        {
          _id: current._id,
          availableStock: { $gte: quantity },
        },
        {
          $inc: { reservedStock: quantity, availableStock: -quantity },
        },
        opts
      );

      if (!updated) {
        throw new ApiError(
          409,
          'Concurrency conflict: Stock was reserved by another order. Please retry.'
        );
      }

      // Record transaction
      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'RESERVATION',
        quantity,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'ORDER',
        referenceId,
        performedBy,
        notes: `Reserved ${quantity} units for order ${referenceId}`,
      });
      await tx.save(session ? { session } : undefined);

      // Create outbox event for marketplace synchronization
      const outbox = new OutboxEvent({
        eventType: 'INVENTORY_RESERVED',
        aggregateId: String(productId),
        payload: {
          productId,
          warehouseId,
          reservedQuantity: quantity,
          referenceId,
          timestamp: new Date().toISOString(),
        },
      });
      await outbox.save(session ? { session } : undefined);

      // Real-time broadcast
      emitInventoryUpdate({
        productId,
        warehouseId,
        updatedStock: updated,
        action: 'RESERVATION',
      });

      return { inventory: updated, transaction: tx, outboxEvent: outbox };
    });
  }

  /**
   * Release reserved stock (e.g., when an order is cancelled before fulfillment)
   */
  async releaseReservation({ productId, warehouseId, quantity, referenceId = '', performedBy = null }) {
    if (quantity <= 0) return;

    return await this.withTransaction(async (session) => {
      const opts = session ? { session, new: true } : { new: true };

      const current = await Inventory.findOne({ productId, warehouseId });
      if (!current) throw new ApiError(404, 'Inventory record not found');

      const releaseQty = Math.min(quantity, current.reservedStock);

      const updated = await Inventory.findOneAndUpdate(
        { _id: current._id, reservedStock: { $gte: releaseQty } },
        {
          $inc: { reservedStock: -releaseQty, availableStock: releaseQty },
        },
        opts
      );

      if (!updated) {
        throw new ApiError(400, 'Unable to release reservation: reserved stock is lower than requested');
      }

      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'RESERVATION_RELEASE',
        quantity: releaseQty,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'ORDER',
        referenceId,
        performedBy,
        notes: `Released reservation of ${releaseQty} units for cancelled order ${referenceId}`,
      });
      await tx.save(session ? { session } : undefined);

      const outbox = new OutboxEvent({
        eventType: 'INVENTORY_RELEASED',
        aggregateId: String(productId),
        payload: {
          productId,
          warehouseId,
          releasedQuantity: releaseQty,
          referenceId,
        },
      });
      await outbox.save(session ? { session } : undefined);

      emitInventoryUpdate({ productId, warehouseId, updatedStock: updated, action: 'RELEASE' });

      return { inventory: updated, transaction: tx };
    });
  }

  /**
   * Stock addition (incoming shipment / restocking)
   */
  async stockIn({ productId, warehouseId, quantity, referenceId = '', performedBy = null, notes = '' }) {
    if (quantity <= 0) {
      throw new ApiError(400, 'Quantity must be positive');
    }

    return await this.withTransaction(async (session) => {
      const opts = session ? { session, new: true, upsert: true } : { new: true, upsert: true };

      let current = await Inventory.findOne({ productId, warehouseId });
      if (!current) {
        current = new Inventory({
          productId,
          warehouseId,
          physicalStock: 0,
          reservedStock: 0,
          damagedStock: 0,
          inTransitStock: 0,
          availableStock: 0,
        });
        await current.save(session ? { session } : undefined);
      }

      const updated = await Inventory.findOneAndUpdate(
        { _id: current._id },
        {
          $inc: { physicalStock: quantity, availableStock: quantity },
        },
        opts
      );

      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'STOCK_IN',
        quantity,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'MANUAL',
        referenceId,
        performedBy,
        notes: notes || `Restocked ${quantity} physical units`,
      });
      await tx.save(session ? { session } : undefined);

      const outbox = new OutboxEvent({
        eventType: 'INVENTORY_RESTOCKED',
        aggregateId: String(productId),
        payload: { productId, warehouseId, addedQuantity: quantity },
      });
      await outbox.save(session ? { session } : undefined);

      emitInventoryUpdate({ productId, warehouseId, updatedStock: updated, action: 'STOCK_IN' });

      return { inventory: updated, transaction: tx };
    });
  }

  /**
   * Stock deduction (fulfillment of an order / physical shipment)
   * Deducts both reserved stock and physical stock
   */
  async stockOut({ productId, warehouseId, quantity, isReserved = true, referenceId = '', performedBy = null }) {
    if (quantity <= 0) throw new ApiError(400, 'Quantity must be positive');

    return await this.withTransaction(async (session) => {
      const opts = session ? { session, new: true } : { new: true };
      const current = await Inventory.findOne({ productId, warehouseId });
      if (!current) throw new ApiError(404, 'Inventory record not found');

      if (current.physicalStock < quantity) {
        throw new ApiError(400, 'Insufficient physical stock to fulfill shipment');
      }

      const updateQuery = isReserved
        ? {
            $inc: {
              physicalStock: -quantity,
              reservedStock: -Math.min(quantity, current.reservedStock),
            },
          }
        : {
            $inc: {
              physicalStock: -quantity,
              availableStock: -quantity,
            },
          };

      const updated = await Inventory.findOneAndUpdate({ _id: current._id }, updateQuery, opts);

      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'STOCK_OUT',
        quantity,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'ORDER',
        referenceId,
        performedBy,
        notes: `Dispatched ${quantity} units for order fulfillment`,
      });
      await tx.save(session ? { session } : undefined);

      emitInventoryUpdate({ productId, warehouseId, updatedStock: updated, action: 'STOCK_OUT' });

      return { inventory: updated, transaction: tx };
    });
  }

  /**
   * Stock adjustment (e.g. following physical count / cycle audit)
   */
  async adjustStock({ productId, warehouseId, newPhysicalStock, newDamagedStock, reason = '', performedBy = null }) {
    return await this.withTransaction(async (session) => {
      const opts = session ? { session, new: true } : { new: true };
      const current = await Inventory.findOne({ productId, warehouseId });
      if (!current) throw new ApiError(404, 'Inventory record not found');

      const targetPhysical = newPhysicalStock !== undefined ? Math.max(0, newPhysicalStock) : current.physicalStock;
      const targetDamaged = newDamagedStock !== undefined ? Math.max(0, newDamagedStock) : current.damagedStock;
      const targetAvailable = Math.max(0, targetPhysical - current.reservedStock - targetDamaged);

      const updated = await Inventory.findOneAndUpdate(
        { _id: current._id },
        {
          $set: {
            physicalStock: targetPhysical,
            damagedStock: targetDamaged,
            availableStock: targetAvailable,
          },
        },
        opts
      );

      const diff = targetPhysical - current.physicalStock;

      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'ADJUSTMENT',
        quantity: diff,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'AUDIT',
        performedBy,
        notes: reason || 'Inventory manual adjustment audit',
      });
      await tx.save(session ? { session } : undefined);

      emitInventoryUpdate({ productId, warehouseId, updatedStock: updated, action: 'ADJUSTMENT' });

      return { inventory: updated, transaction: tx };
    });
  }

  /**
   * Process returned stock: restore sellable items to available stock, move damaged to damagedStock
   */
  async processReturn({ productId, warehouseId, sellableQuantity = 0, damagedQuantity = 0, referenceId = '', performedBy = null }) {
    return await this.withTransaction(async (session) => {
      const opts = session ? { session, new: true } : { new: true };
      const current = await Inventory.findOne({ productId, warehouseId });
      if (!current) throw new ApiError(404, 'Inventory record not found');

      const totalReturned = sellableQuantity + damagedQuantity;
      if (totalReturned <= 0) throw new ApiError(400, 'Returned quantity must be greater than 0');

      const updated = await Inventory.findOneAndUpdate(
        { _id: current._id },
        {
          $inc: {
            physicalStock: totalReturned,
            availableStock: sellableQuantity,
            damagedStock: damagedQuantity,
          },
        },
        opts
      );

      const tx = new InventoryTransaction({
        productId,
        warehouseId,
        transactionType: 'RETURN_RESTORE',
        quantity: totalReturned,
        previousStock: {
          physical: current.physicalStock,
          reserved: current.reservedStock,
          available: current.availableStock,
        },
        updatedStock: {
          physical: updated.physicalStock,
          reserved: updated.reservedStock,
          available: updated.availableStock,
        },
        source: 'ORDER',
        referenceId,
        performedBy,
        notes: `Returned goods inspected: ${sellableQuantity} sellable restored, ${damagedQuantity} marked damaged`,
      });
      await tx.save(session ? { session } : undefined);

      emitInventoryUpdate({ productId, warehouseId, updatedStock: updated, action: 'RETURN' });

      return { inventory: updated, transaction: tx };
    });
  }
}

module.exports = new InventoryService();
