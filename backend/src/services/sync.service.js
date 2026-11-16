const { Marketplace, MarketplaceListing, SyncJob, OutboxEvent, Product } = require('../models');
const { getAdapter, getAllAdapters } = require('../adapters/marketplace');
const inventoryService = require('./inventory.service');
const { emitSyncEvent, emitNotification } = require('../sockets/socketHandler');

class SyncService {
  /**
   * Broadcast updated stock for a product to all connected marketplaces
   */
  async syncProductToAllMarketplaces(productId, triggeringMarketplaceId = null) {
    const product = await Product.findById(productId);
    if (!product) return;

    // 1. Calculate source-of-truth available stock across all warehouses
    const totalStock = await inventoryService.getTotalStock(productId);
    const availableStock = totalStock.availableStock;

    // 2. Fetch all active marketplaces
    const marketplaces = await Marketplace.find({ status: 'CONNECTED' });

    const syncResults = [];

    for (const mp of marketplaces) {
      // Find or create listing mapping
      let listing = await MarketplaceListing.findOne({
        productId: product._id,
        marketplaceId: mp._id,
      });

      if (!listing) {
        listing = new MarketplaceListing({
          productId: product._id,
          marketplaceId: mp._id,
          internalSKU: product.sku,
          externalSKU: `${mp.code.toUpperCase()}-${product.sku}`,
          externalProductId: `${mp.code.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
          channelAllocatedStock: availableStock,
          lastPublishedStock: 0,
        });
      }

      // 3. Safety buffer calculation: do not publish full stock if buffer is configured
      const bufferPct = mp.settings?.safetyBufferPercentage || 0;
      const bufferQty = Math.floor((availableStock * bufferPct) / 100);
      const publishQuantity = Math.max(0, availableStock - bufferQty);

      // Create SyncJob record
      const syncJob = new SyncJob({
        jobId: `SYNC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product._id,
        marketplaceId: mp._id,
        requestedStock: availableStock,
        publishedStock: publishQuantity,
        status: 'PROCESSING',
      });
      await syncJob.save();

      const startTime = Date.now();

      try {
        const adapter = getAdapter(mp.code);
        const result = await adapter.updateInventory(listing.externalSKU || product.sku, publishQuantity);

        syncJob.status = 'COMPLETED';
        syncJob.durationMs = Date.now() - startTime;
        await syncJob.save();

        listing.lastPublishedStock = publishQuantity;
        listing.channelAllocatedStock = publishQuantity;
        listing.syncStatus = 'IN_SYNC';
        listing.lastSyncedAt = new Date();
        listing.errorMessage = '';
        await listing.save();

        syncResults.push({
          marketplace: mp.name,
          code: mp.code,
          publishedStock: publishQuantity,
          status: 'SUCCESS',
        });
      } catch (err) {
        console.error(`[SyncService] Failed to sync ${product.sku} to ${mp.name}:`, err.message);

        syncJob.status = 'FAILED';
        syncJob.errorMessage = err.message;
        syncJob.durationMs = Date.now() - startTime;
        syncJob.retryCount = 1;
        await syncJob.save();

        listing.syncStatus = 'FAILED';
        listing.errorMessage = err.message;
        await listing.save();

        syncResults.push({
          marketplace: mp.name,
          code: mp.code,
          publishedStock: publishQuantity,
          status: 'FAILED',
          error: err.message,
        });

        // Notify dashboard of failure
        emitNotification({
          title: 'Marketplace Sync Failed',
          message: `Failed to update stock for SKU ${product.sku} on ${mp.name}: ${err.message}`,
          type: 'SYNC_FAILED',
          severity: 'error',
        });
      }
    }

    // Real-time broadcast
    emitSyncEvent({
      productId: product._id,
      sku: product.sku,
      availableStock,
      syncResults,
      timestamp: new Date().toISOString(),
    });

    return syncResults;
  }

  /**
   * Process pending outbox events (Transactional Outbox Worker)
   */
  async processOutboxEvents(batchSize = 20) {
    const events = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    for (const evt of events) {
      evt.status = 'PROCESSING';
      await evt.save();

      try {
        if (
          evt.eventType === 'MARKETPLACE_SYNC_REQUIRED' ||
          evt.eventType === 'INVENTORY_RESERVED' ||
          evt.eventType === 'INVENTORY_RELEASED' ||
          evt.eventType === 'INVENTORY_RESTOCKED'
        ) {
          const productId = evt.aggregateId || evt.payload?.productId;
          await this.syncProductToAllMarketplaces(productId);
        }

        evt.status = 'PUBLISHED';
        evt.publishedAt = new Date();
        await evt.save();
      } catch (err) {
        evt.status = 'FAILED';
        evt.errorMessage = err.message;
        evt.retryCount += 1;
        await evt.save();
      }
    }
  }

  /**
   * Reconcile all product listings against centralized inventory source of truth
   */
  async reconcileAllInventory() {
    const products = await Product.find({ isActive: true });
    const results = [];

    for (const prod of products) {
      const syncResult = await this.syncProductToAllMarketplaces(prod._id);
      results.push({ sku: prod.sku, syncResult });
    }

    return results;
  }
}

module.exports = new SyncService();
