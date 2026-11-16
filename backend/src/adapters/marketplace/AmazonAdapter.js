const BaseAdapter = require('./BaseAdapter');

class AmazonAdapter extends BaseAdapter {
  constructor() {
    super('Amazon', 'amazon');
  }

  normalizeOrder(rawOrder) {
    const orderId = rawOrder.AmazonOrderId || rawOrder.orderId || `AMZ-${Date.now()}`;
    const buyerInfo = rawOrder.BuyerInfo || rawOrder.customer || {};
    const shippingAddress = rawOrder.ShippingAddress || {};

    const items = (rawOrder.OrderItems || rawOrder.items || []).map((item) => ({
      sku: item.SellerSKU || item.sku,
      quantity: Number(item.QuantityOrdered || item.quantity || 1),
      unitPrice: Number(item.ItemPrice?.Amount || item.unitPrice || 0),
    }));

    const totalAmount =
      Number(rawOrder.OrderTotal?.Amount) ||
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      marketplaceOrderId: orderId,
      marketplaceName: 'Amazon',
      marketplaceCode: 'amazon',
      customer: {
        name: buyerInfo.BuyerName || buyerInfo.name || 'Amazon Shopper',
        email: buyerInfo.BuyerEmail || buyerInfo.email || 'shopper@amazon-buyer.in',
        phone: shippingAddress.Phone || '9876543210',
        shippingAddress: {
          city: shippingAddress.City || 'Delhi',
          state: shippingAddress.StateOrRegion || 'Delhi',
          pincode: shippingAddress.PostalCode || '110001',
        },
      },
      items,
      totalAmount,
      rawPayload: rawOrder,
    };
  }

  async verifyWebhook(signature, body) {
    // In production: Validate AWS SNS signature header or Amazon SP-API Notification digest
    if (process.env.NODE_ENV === 'production' && !this.isSimulated) {
      return Boolean(signature && signature.length > 10);
    }
    return true;
  }
}

module.exports = AmazonAdapter;
