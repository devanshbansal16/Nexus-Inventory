const { Order, Product, Marketplace, OutboxEvent } = require('../models');
const inventoryService = require('./inventory.service');
const allocationService = require('./allocation.service');
const ApiError = require('../utils/ApiError');
const { emitOrderCreated } = require('../sockets/socketHandler');

class OrderService {
  /**
   * Process incoming order (from webhook or direct store)
   */
  async processIncomingOrder({
    marketplaceId,
    marketplaceOrderId,
    customer,
    items,
    totalAmount,
    idempotencyKey,
  }) {
    // 1. Idempotency Check: if already processed, return existing order to avoid duplicate deduction
    if (idempotencyKey) {
      const existingKey = await Order.findOne({ idempotencyKey });
      if (existingKey) {
        console.log(`[OrderService] Duplicate idempotencyKey "${idempotencyKey}", returning existing order`);
        return { order: existingKey, isDuplicate: true };
      }
    }

    const existingOrder = await Order.findOne({ marketplaceId, marketplaceOrderId });
    if (existingOrder) {
      console.log(`[OrderService] Order ${marketplaceOrderId} already exists, skipping duplicate processing`);
      return { order: existingOrder, isDuplicate: true };
    }

    // 2. Identify products and validate SKUs
    const processedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ sku: item.sku.toUpperCase() });
      if (!product) {
        throw new ApiError(404, `Product with SKU ${item.sku} does not exist in CIMS catalog`);
      }

      // 3. Smart Warehouse Allocation
      const allocation = await allocationService.allocateWarehouse({
        productId: product._id,
        quantity: item.quantity,
        customerCity: customer?.shippingAddress?.city || 'Delhi',
      });

      // 4. Reserve stock atomically in the allocated warehouse
      await inventoryService.reserveStock({
        productId: product._id,
        warehouseId: allocation.allocatedWarehouseId,
        quantity: item.quantity,
        referenceId: marketplaceOrderId,
      });

      const unitPrice = item.unitPrice || product.sellingPrice;
      calculatedTotal += unitPrice * item.quantity;

      processedItems.push({
        productId: product._id,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        allocatedWarehouseId: allocation.allocatedWarehouseId,
        isReserved: true,
        allocationDetails: {
          warehouseName: allocation.warehouseName,
          distanceKm: allocation.estimatedDistanceKm,
          shippingCost: allocation.estimatedShippingCost,
          reason: allocation.allocationReason,
        },
      });
    }

    // 5. Create Internal Order Record
    const internalOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = new Order({
      orderId: internalOrderId,
      marketplaceOrderId,
      marketplaceId,
      items: processedItems,
      totalAmount: totalAmount || calculatedTotal,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      customer,
      idempotencyKey: idempotencyKey || `${marketplaceId}-${marketplaceOrderId}`,
    });

    await order.save();

    // 6. Transactional Outbox Event to sync other marketplaces
    for (const item of processedItems) {
      const outbox = new OutboxEvent({
        eventType: 'MARKETPLACE_SYNC_REQUIRED',
        aggregateId: String(item.productId),
        payload: {
          productId: item.productId,
          sku: item.sku,
          triggeringMarketplaceId: marketplaceId,
          orderId: internalOrderId,
          timestamp: new Date().toISOString(),
        },
      });
      await outbox.save();
    }

    // 7. Real-time broadcast
    emitOrderCreated(order);

    return { order, isDuplicate: false };
  }

  /**
   * Cancel an order: release reservations atomically
   */
  async cancelOrder(orderId, reason = '', performedBy = null) {
    const order = await Order.findOne({ $or: [{ orderId }, { _id: orderId }] });
    if (!order) throw new ApiError(404, 'Order not found');

    if (order.orderStatus === 'CANCELLED') {
      return order; // idempotent
    }

    if (order.orderStatus === 'DELIVERED') {
      throw new ApiError(400, 'Cannot cancel a delivered order. Use return workflow instead.');
    }

    // If order was already shipped/fulfilled, restore physical stock
    // If order was only confirmed/processing, release reservations
    for (const item of order.items) {
      if (item.isReserved) {
        if (order.orderStatus === 'SHIPPED') {
          // Restore physical stock
          await inventoryService.stockIn({
            productId: item.productId,
            warehouseId: item.allocatedWarehouseId,
            quantity: item.quantity,
            referenceId: order.orderId,
            performedBy,
            notes: `Cancelled in-transit shipment restored to physical inventory: ${reason}`,
          });
        } else {
          // Release reservation
          await inventoryService.releaseReservation({
            productId: item.productId,
            warehouseId: item.allocatedWarehouseId,
            quantity: item.quantity,
            referenceId: order.orderId,
            performedBy,
          });
        }
        item.isReserved = false;
      }
    }

    order.orderStatus = 'CANCELLED';
    order.notes = `${order.notes || ''} [Cancelled: ${reason}]`.trim();
    await order.save();

    return order;
  }

  /**
   * Process customer returns
   */
  async processReturn(orderId, { items, reason = '', performedBy = null }) {
    const order = await Order.findOne({ $or: [{ orderId }, { _id: orderId }] });
    if (!order) throw new ApiError(404, 'Order not found');

    if (order.orderStatus === 'RETURNED') {
      throw new ApiError(400, 'Order has already been returned');
    }

    for (const returnItem of items) {
      const orderItem = order.items.find(
        (it) => String(it.productId) === String(returnItem.productId) || it.sku === returnItem.sku
      );

      if (!orderItem) continue;

      const warehouseId = returnItem.warehouseId || orderItem.allocatedWarehouseId;
      const sellable = Number(returnItem.sellableQuantity || 0);
      const damaged = Number(returnItem.damagedQuantity || 0);

      await inventoryService.processReturn({
        productId: orderItem.productId,
        warehouseId,
        sellableQuantity: sellable,
        damagedQuantity: damaged,
        referenceId: order.orderId,
        performedBy,
      });
    }

    order.orderStatus = 'RETURNED';
    await order.save();

    return order;
  }
}

module.exports = new OrderService();
