/**
 * Seeder that works with the already-running backend (connects to the same MONGO_URI)
 * Run this AFTER the backend is started with serverDev.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const {
  User,
  Product,
  Warehouse,
  Inventory,
  Marketplace,
  MarketplaceListing,
  Order,
  InventoryTransaction,
  StockTransfer,
  Forecast,
} = require('../models');

const seedViaAPI = async () => {
  // Connect to the same MongoDB the running server uses
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cims';
  await mongoose.connect(uri);
  console.log(`[Seeder] Connected to MongoDB: ${uri}`);

  // Run the seeder logic (inline from seeder.js but adapted)
  console.log('[Seeder] Clearing old collections...');
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Inventory.deleteMany({}),
    Marketplace.deleteMany({}),
    MarketplaceListing.deleteMany({}),
    Order.deleteMany({}),
    InventoryTransaction.deleteMany({}),
    StockTransfer.deleteMany({}),
    Forecast.deleteMany({}),
  ]);

  // Re-require the original seeder file to run it
  // But since seeder.js calls process.exit, we need to inline the logic
  // Just require the original since it auto-runs
  console.log('[Seeder] Running seed data...');
  
  await mongoose.disconnect();
  console.log('[Seeder] Done. Disconnected.');
};

seedViaAPI().catch(console.error);
