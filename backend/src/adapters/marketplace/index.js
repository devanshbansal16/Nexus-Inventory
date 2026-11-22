const BaseAdapter = require('./BaseAdapter');
const AmazonAdapter = require('./AmazonAdapter');
const FlipkartAdapter = require('./FlipkartAdapter');
const MeeshoAdapter = require('./MeeshoAdapter');
const ShopifyAdapter = require('./ShopifyAdapter');

class GenericMarketplaceAdapter extends BaseAdapter {
  constructor(name, code) {
    super(name || code.toUpperCase(), code);
  }

  normalizeOrder(rawOrder) {
    return {
      marketplaceOrderId: rawOrder.orderId || `${this.code.toUpperCase()}-${Date.now()}`,
      marketplaceName: this.name,
      marketplaceCode: this.code,
      customer: rawOrder.customer || {
        name: 'Marketplace Buyer',
        email: `buyer@${this.code}.com`,
        phone: '9876543210',
        shippingAddress: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
      },
      items: rawOrder.items || [],
      totalAmount: rawOrder.totalAmount || 0,
      rawPayload: rawOrder,
    };
  }
}

const adapters = {
  amazon: new AmazonAdapter(),
  flipkart: new FlipkartAdapter(),
  meesho: new MeeshoAdapter(),
  shopify: new ShopifyAdapter(),
};

const getAdapter = (marketplaceCode) => {
  const code = String(marketplaceCode).toLowerCase();
  if (!adapters[code]) {
    adapters[code] = new GenericMarketplaceAdapter(code.toUpperCase(), code);
  }
  return adapters[code];
};

const getAllAdapters = () => Object.values(adapters);

module.exports = {
  adapters,
  getAdapter,
  getAllAdapters,
};
