const mongoose = require('mongoose');

const syncJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      unique: true,
      sparse: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    marketplaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketplace',
      required: true,
    },
    requestedStock: {
      type: Number,
      required: true,
    },
    publishedStock: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    durationMs: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SyncJob', syncJobSchema);
