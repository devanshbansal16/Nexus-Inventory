const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
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
    transactionType: {
      type: String,
      enum: [
        'STOCK_IN',
        'STOCK_OUT',
        'RESERVATION',
        'RESERVATION_RELEASE',
        'ADJUSTMENT',
        'TRANSFER_DISPATCH',
        'TRANSFER_RECEIVE',
        'RETURN_RESTORE',
        'DAMAGED_MOVE',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      physical: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
    },
    updatedStock: {
      physical: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
    },
    source: {
      type: String,
      enum: ['MANUAL', 'ORDER', 'TRANSFER', 'AUDIT', 'WEBHOOK', 'SYSTEM'],
      default: 'MANUAL',
    },
    referenceId: {
      type: String,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
