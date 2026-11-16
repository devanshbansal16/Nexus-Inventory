const AmazonAdapter = require('./AmazonAdapter');
const FlipkartAdapter = require('./FlipkartAdapter');
const MeeshoAdapter = require('./MeeshoAdapter');
const ShopifyAdapter = require('./ShopifyAdapter');

const adapters = {
  amazon: new AmazonAdapter(),
  flipkart: new FlipkartAdapter(),
  meesho: new MeeshoAdapter(),
  shopify: new ShopifyAdapter(),
};

const getAdapter = (marketplaceCode) => {
  const code = String(marketplaceCode).toLowerCase();
  const adapter = adapters[code];
  if (!adapter) {
    throw new Error(`Unsupported marketplace adapter: ${marketplaceCode}`);
  }
  return adapter;
};

const getAllAdapters = () => Object.values(adapters);

module.exports = {
  adapters,
  getAdapter,
  getAllAdapters,
};
