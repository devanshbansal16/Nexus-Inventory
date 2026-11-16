const BaseAdapter = require('./BaseAdapter');

class FlipkartAdapter extends BaseAdapter {
  constructor() {
    super('Flipkart', 'flipkart');
  }

  normalizeOrder(rawOrder) {
    const orderId = rawOrder.orderId || rawOrder.flipkartOrderId || `FLP-${Date.now()}`;
    const customer = rawOrder.customer || rawOrder.deliveryAddress || {};

    const items = (rawOrder.orderItems || rawOrder.items || []).map((item) => ({
      sku: item.sku || item.fsn || item.sellerSku,
      quantity: Number(item.quantity || item.quantityOrdered || 1),
      unitPrice: Number(item.sellingPrice || item.price || item.unitPrice || 0),
    }));

    const totalAmount =
      Number(rawOrder.totalPrice) ||
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      marketplaceOrderId: orderId,
      marketplaceName: 'Flipkart',
      marketplaceCode: 'flipkart',
      customer: {
        name: customer.name || customer.contactName || 'Flipkart Buyer',
        email: customer.email || 'customer@flipkart-user.in',
        phone: customer.phone || '9876543211',
        shippingAddress: {
          city: customer.city || 'Mumbai',
          state: customer.state || 'Maharashtra',
          pincode: customer.pincode || customer.postalCode || '400001',
        },
      },
      items,
      totalAmount,
      rawPayload: rawOrder,
    };
  }

  async verifyWebhook(signature, body) {
    // In production: Validate HMAC SHA256 using Flipkart Application Secret
    return true;
  }
}

module.exports = FlipkartAdapter;
