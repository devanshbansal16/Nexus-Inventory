const mongoose = require('mongoose');
const { Order, Marketplace } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const orderService = require('../services/order.service');
const syncService = require('../services/sync.service');
const { DEMO_ORDERS } = require('../utils/demoData');

const createOrder = asyncHandler(async (req, res) => {
  const {
    marketplaceId,
    marketplaceOrderId,
    customer,
    items,
    totalAmount,
    idempotencyKey,
  } = req.body;

  let targetMarketplaceId = marketplaceId;
  if (!targetMarketplaceId) {
    let directMp = await Marketplace.findOne({ code: 'direct' });
    if (!directMp) {
      directMp = await Marketplace.create({
        name: 'Company Website',
        code: 'direct',
        status: 'CONNECTED',
        isSimulated: true,
      });
    }
    targetMarketplaceId = directMp._id;
  }

  const result = await orderService.processIncomingOrder({
    marketplaceId: targetMarketplaceId,
    marketplaceOrderId: marketplaceOrderId || `DIR-${Date.now()}`,
    customer,
    items,
    totalAmount,
    idempotencyKey,
  });

  // Trigger sync in background
  if (!result.isDuplicate) {
    for (const item of result.order.items) {
      syncService.syncProductToAllMarketplaces(item.productId, targetMarketplaceId).catch((err) => {
        console.error('Marketplace sync error after order:', err.message);
      });
    }
  }

  return new ApiResponse(
    result.isDuplicate ? 200 : 201,
    result.isDuplicate ? 'Duplicate order recognized; returned existing record' : 'Order processed and inventory reserved',
    result.order
  ).send(res, result.isDuplicate ? 200 : 201);
});

const getOrders = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return new ApiResponse(200, 'Orders fetched successfully (Demo Mode)', {
      orders: DEMO_ORDERS,
      pagination: {
        total: DEMO_ORDERS.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }).send(res, 200);
  }

  const { page = 1, limit = 20, status, marketplaceId, search } = req.query;

  const query = {};
  if (status) query.orderStatus = status.toUpperCase();
  if (marketplaceId) query.marketplaceId = marketplaceId;
  if (search) {
    query.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { marketplaceOrderId: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('marketplaceId', 'name code')
    .populate('items.productId', 'name sku image')
    .populate('items.allocatedWarehouseId', 'name warehouseCode')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return new ApiResponse(200, 'Orders fetched successfully', {
    orders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }).send(res, 200);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('marketplaceId')
    .populate('items.productId')
    .populate('items.allocatedWarehouseId');

  if (!order) throw new ApiError(404, 'Order not found');

  return new ApiResponse(200, 'Order details fetched', order).send(res, 200);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  order.orderStatus = status;
  await order.save();

  return new ApiResponse(200, 'Order status updated', order).send(res, 200);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await orderService.cancelOrder(req.params.id, reason, req.user?._id);

  // Sync back released inventory to all platforms
  for (const item of order.items) {
    syncService.syncProductToAllMarketplaces(item.productId).catch((err) => {
      console.error('Marketplace sync error after cancellation:', err.message);
    });
  }

  return new ApiResponse(200, 'Order cancelled and reserved stock released', order).send(res, 200);
});

const returnOrder = asyncHandler(async (req, res) => {
  const { items, reason } = req.body;
  const order = await orderService.processReturn(req.params.id, {
    items,
    reason,
    performedBy: req.user?._id,
  });

  return new ApiResponse(200, 'Order return processed and inventory updated', order).send(res, 200);
});

const getOrdersByMarketplace = asyncHandler(async (req, res) => {
  const orders = await Order.find({ marketplaceId: req.params.marketplaceId })
    .populate('items.productId')
    .sort({ createdAt: -1 });

  return new ApiResponse(200, 'Marketplace orders fetched', orders).send(res, 200);
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  returnOrder,
  getOrdersByMarketplace,
};
