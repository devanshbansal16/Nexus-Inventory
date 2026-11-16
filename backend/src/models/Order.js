const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sku: {
    type: String,
    required: true,
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  allocatedWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  isReserved: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    marketplaceOrderId: {
      type: String,
      required: true,
      index: true,
    },
    marketplaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketplace',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
      default: 'PENDING',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'PAID',
    },
    customer: {
      name: { type: String, default: 'Customer' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      shippingAddress: {
        city: { type: String, default: 'Delhi' },
        state: { type: String, default: 'Delhi' },
        pincode: { type: String, default: '110001' },
      },
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
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

// Compound unique index ensuring no duplicate marketplace order is saved
orderSchema.index({ marketplaceId: 1, marketplaceOrderId: 1 }, { unique: true });

module.exports = mongoose.model('Order', orderSchema);
