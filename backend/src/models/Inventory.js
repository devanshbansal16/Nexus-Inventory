const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    physicalStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Physical stock cannot be negative'],
    },
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
    damagedStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Damaged stock cannot be negative'],
    },
    inTransitStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'In-transit stock cannot be negative'],
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Available stock cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one stock record per product per warehouse
inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

// Always compute available stock before saving
inventorySchema.pre('save', function (next) {
  this.availableStock = Math.max(0, this.physicalStock - this.reservedStock - this.damagedStock);
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
