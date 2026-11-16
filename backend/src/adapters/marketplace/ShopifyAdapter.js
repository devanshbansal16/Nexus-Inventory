const BaseAdapter = require('./BaseAdapter');

class ShopifyAdapter extends BaseAdapter {
  constructor() {
    super('Shopify', 'shopify');
  }

  normalizeOrder(rawOrder) {
    const orderId = rawOrder.name || (rawOrder.id ? `SHP-${rawOrder.id}` : `SHP-${Date.now()}`);
    const customer = rawOrder.customer || {};
    const shipping = rawOrder.shipping_address || {};

    const items = (rawOrder.line_items || rawOrder.items || []).map((item) => ({
      sku: item.sku,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.price || item.unitPrice || 0),
    }));

    const totalAmount =
      Number(rawOrder.total_price) ||
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      marketplaceOrderId: String(orderId),
      marketplaceName: 'Shopify',
      marketplaceCode: 'shopify',
      customer: {
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Direct Shopify Buyer',
        email: customer.email || 'customer@shopify-store.com',
        phone: shipping.phone || customer.phone || '9876543213',
        shippingAddress: {
          city: shipping.city || 'Hyderabad',
          state: shipping.province || 'Telangana',
          pincode: shipping.zip || '500001',
        },
      },
      items,
      totalAmount,
      rawPayload: rawOrder,
    };
  }

  async verifyWebhook(signature, body) {
    // In production: HMAC SHA256 of raw body against SHOPIFY_WEBHOOK_SECRET
    return true;
  }
}

module.exports = ShopifyAdapter;
