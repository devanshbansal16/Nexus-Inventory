const { Marketplace } = require('../models');
const { getAdapter } = require('../adapters/marketplace');
const orderService = require('../services/order.service');
const syncService = require('../services/sync.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');

async function handleMarketplaceOrderWebhook(platformCode, req, res) {
  const adapter = getAdapter(platformCode);

  // 1. Webhook Signature Verification
  const signature = req.headers['x-hub-signature'] || req.headers['x-shopify-hmac-sha256'] || req.headers['authorization'];
  const isValid = await adapter.verifyWebhook(signature, req.body);
  if (!isValid) {
    throw new ApiError(401, `Invalid webhook signature for ${adapter.name}`);
  }

  // 2. Identify the Marketplace DB Record
  let marketplace = await Marketplace.findOne({ code: platformCode });
  if (!marketplace) {
    marketplace = await Marketplace.create({
      name: adapter.name,
      code: platformCode,
      status: 'CONNECTED',
      isSimulated: true,
    });
  }

  // 3. Normalize external payload into standard internal structure
  const normalized = adapter.normalizeOrder(req.body);

  // 4. Process incoming order (idempotent, allocation, atomic reservation)
  const result = await orderService.processIncomingOrder({
    marketplaceId: marketplace._id,
    marketplaceOrderId: normalized.marketplaceOrderId,
    customer: normalized.customer,
    items: normalized.items,
    totalAmount: normalized.totalAmount,
    idempotencyKey: req.headers['x-idempotency-key'] || `${platformCode}-${normalized.marketplaceOrderId}`,
  });

  // 5. Broadcast updated stock to all other connected marketplaces in the background
  if (!result.isDuplicate) {
    for (const item of result.order.items) {
      syncService.syncProductToAllMarketplaces(item.productId, marketplace._id).catch((err) => {
        console.error(`[Webhook] Background sync error for product ${item.productId}:`, err.message);
      });
    }
  }

  return new ApiResponse(
    200,
    result.isDuplicate
      ? `Duplicate ${adapter.name} order acknowledged without double-processing`
      : `Successfully processed ${adapter.name} order and synchronized multi-warehouse inventory`,
    {
      orderId: result.order.orderId,
      marketplaceOrderId: result.order.marketplaceOrderId,
      status: result.order.orderStatus,
      isDuplicate: result.isDuplicate,
      allocatedItems: result.order.items.map((it) => ({
        sku: it.sku,
        allocatedWarehouseId: it.allocatedWarehouseId,
        quantity: it.quantity,
      })),
    }
  ).send(res, 200);
}

const amazonOrders = asyncHandler(async (req, res) => {
  return handleMarketplaceOrderWebhook('amazon', req, res);
});

const flipkartOrders = asyncHandler(async (req, res) => {
  return handleMarketplaceOrderWebhook('flipkart', req, res);
});

const meeshoOrders = asyncHandler(async (req, res) => {
  return handleMarketplaceOrderWebhook('meesho', req, res);
});

const shopifyOrders = asyncHandler(async (req, res) => {
  return handleMarketplaceOrderWebhook('shopify', req, res);
});

const platformCancellations = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { orderId, marketplaceOrderId, reason } = req.body;

  const targetOrderId = orderId || marketplaceOrderId;
  const order = await orderService.cancelOrder(targetOrderId, reason || `Cancelled via ${platform} webhook`);

  return new ApiResponse(200, `Order cancelled via ${platform} webhook`, order).send(res, 200);
});

module.exports = {
  amazonOrders,
  flipkartOrders,
  meeshoOrders,
  shopifyOrders,
  platformCancellations,
};
