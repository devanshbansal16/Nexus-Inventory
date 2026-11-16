const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    marketplaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketplace',
      required: true,
      index: true,
    },
    internalSKU: {
      type: String,
      required: true,
      uppercase: true,
    },
    externalSKU: {
      type: String,
      required: true,
    },
    externalProductId: {
      type: String,
      required: true,
    },
    channelAllocatedStock: {
      type: Number,
      default: 0,
    },
    lastPublishedStock: {
      type: Number,
      default: 0,
    },
    syncStatus: {
      type: String,
      enum: ['IN_SYNC', 'OUT_OF_SYNC', 'FAILED', 'PENDING'],
      default: 'IN_SYNC',
    },
    lastSyncedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

marketplaceListingSchema.index({ productId: 1, marketplaceId: 1 }, { unique: true });
marketplaceListingSchema.index({ marketplaceId: 1, externalSKU: 1 });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);
