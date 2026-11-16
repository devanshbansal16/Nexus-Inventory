const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    forecastDate: {
      type: Date,
      default: Date.now,
    },
    horizonDays: {
      type: Number,
      enum: [7, 14, 30],
      default: 7,
    },
    predictedDemand: {
      type: Number,
      required: true,
    },
    confidenceInterval: {
      lower: { type: Number, default: 0 },
      upper: { type: Number, default: 0 },
    },
    recommendedReorderQuantity: {
      type: Number,
      default: 0,
    },
    recommendedRestockDate: {
      type: Date,
    },
    isStockoutRisk: {
      type: Boolean,
      default: false,
    },
    modelName: {
      type: String,
      default: 'MovingAverage_v1',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Forecast', forecastSchema);
