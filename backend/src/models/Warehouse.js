const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    warehouseCode: {
      type: String,
      required: [true, 'Warehouse code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, default: 'India' },
      pincode: { type: String, required: true },
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    capacity: {
      type: Number,
      required: true,
      min: [1, 'Capacity must be at least 1 unit'],
    },
    currentUtilization: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Warehouse', warehouseSchema);
