const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['Amazon', 'Flipkart', 'Meesho', 'Shopify', 'Company Website'],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      enum: ['amazon', 'flipkart', 'meesho', 'shopify', 'direct'],
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'ERROR'],
      default: 'CONNECTED',
    },
    isSimulated: {
      type: Boolean,
      default: true,
    },
    apiKey: {
      type: String,
      default: '',
    },
    apiSecret: {
      type: String,
      default: '',
    },
    webhookSecret: {
      type: String,
      default: '',
    },
    settings: {
      safetyBufferPercentage: {
        type: Number,
        default: 5, // Reserve 5% buffer from being published
        min: 0,
        max: 50,
      },
      autoSync: {
        type: Boolean,
        default: true,
      },
      lastSyncAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Marketplace', marketplaceSchema);
