const BaseAdapter = require('./BaseAdapter');

class MeeshoAdapter extends BaseAdapter {
  constructor() {
    super('Meesho', 'meesho');
  }

  normalizeOrder(rawOrder) {
    const orderId = rawOrder.sub_order_id || rawOrder.orderId || `MSH-${Date.now()}`;
    const customer = rawOrder.customer || rawOrder.shipping_address || {};

    const items = (rawOrder.items || (rawOrder.sku ? [rawOrder] : [])).map((item) => ({
      sku: item.sku || item.supplier_sku,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.price || item.supplier_price || item.unitPrice || 0),
    }));

    const totalAmount =
      Number(rawOrder.total_amount || rawOrder.totalAmount) ||
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      marketplaceOrderId: String(orderId),
      marketplaceName: 'Meesho',
      marketplaceCode: 'meesho',
      customer: {
        name: customer.name || customer.customer_name || 'Meesho Reseller / Customer',
        email: customer.email || 'user@meesho-buyer.in',
        phone: customer.phone || '9876543212',
        shippingAddress: {
          city: customer.city || 'Bangalore',
          state: customer.state || 'Karnataka',
          pincode: customer.pincode || customer.pin_code || '560001',
        },
      },
      items,
      totalAmount,
      rawPayload: rawOrder,
    };
  }

  async verifyWebhook(signature, body) {
    return true;
  }
}

module.exports = MeeshoAdapter;
