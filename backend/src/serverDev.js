/**
 * Development startup script using mongodb-memory-server.
 * Creates an in-memory MongoDB instance — no local MongoDB installation needed.
 * Automatically seeds sample data after startup.
 */
require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { startOutboxWorker } = require('./workers/syncWorker');

const PORT = process.env.PORT || 5000;

/* ─── Inline seed logic (adapted from utils/seeder.js) ─── */
const seedDatabase = async () => {
  const {
    User, Product, Warehouse, Inventory,
    Marketplace, MarketplaceListing, Order,
    InventoryTransaction, StockTransfer, Forecast,
  } = require('./models');

  console.log('[Seeder] Clearing collections...');
  await Promise.all([
    User.deleteMany({}), Product.deleteMany({}), Warehouse.deleteMany({}),
    Inventory.deleteMany({}), Marketplace.deleteMany({}), MarketplaceListing.deleteMany({}),
    Order.deleteMany({}), InventoryTransaction.deleteMany({}),
    StockTransfer.deleteMany({}), Forecast.deleteMany({}),
  ]);

  /* Users */
  const users = await User.create([
    { name: 'Aditi Sharma (Super Admin)', email: 'admin@cims.com', passwordHash: 'Admin@123', role: 'super_admin', isActive: true },
    { name: 'Rajesh Verma (Inventory Manager)', email: 'inventory@cims.com', passwordHash: 'Admin@123', role: 'inventory_manager', isActive: true },
    { name: 'Vikram Singh (Delhi Warehouse Mgr)', email: 'warehouse.delhi@cims.com', passwordHash: 'Admin@123', role: 'warehouse_manager', isActive: true },
    { name: 'Pooja Nair (Mumbai Warehouse Mgr)', email: 'warehouse.mumbai@cims.com', passwordHash: 'Admin@123', role: 'warehouse_manager', isActive: true },
    { name: 'Suresh Patel (Sales Manager)', email: 'sales@cims.com', passwordHash: 'Admin@123', role: 'sales_manager', isActive: true },
  ]);
  const [superAdmin, invManager, whDelhiMgr, whMumbaiMgr] = users;

  /* Warehouses */
  const warehouses = await Warehouse.create([
    { warehouseCode: 'WH-DEL-01', name: 'Delhi Northern Hub', address: { street: 'Okhla Industrial Area Phase III', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110020' }, managerId: whDelhiMgr._id, capacity: 5000, priority: 1 },
    { warehouseCode: 'WH-BOM-02', name: 'Mumbai Western Hub', address: { street: 'Bhiwandi Logistics Park', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '421302' }, managerId: whMumbaiMgr._id, capacity: 4500, priority: 2 },
    { warehouseCode: 'WH-BLR-03', name: 'Bangalore Southern Hub', address: { street: 'Whitefield Industrial Corridor', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560066' }, managerId: invManager._id, capacity: 4000, priority: 3 },
  ]);
  const [whDelhi, whMumbai, whBangalore] = warehouses;

  await User.findByIdAndUpdate(whDelhiMgr._id, { assignedWarehouses: [whDelhi._id] });
  await User.findByIdAndUpdate(whMumbaiMgr._id, { assignedWarehouses: [whMumbai._id] });

  /* Products */
  const products = await Product.create([
    { name: 'MacBook Pro 16 M3 Max', sku: 'LAP-MBP-16', description: '16-inch Liquid Retina XDR display, 36GB Unified Memory, 512GB SSD', category: 'Laptops', brand: 'Apple', purchasePrice: 180000, sellingPrice: 249900, minimumStockLevel: 15, reorderQuantity: 40, barcode: '8901234567890' },
    { name: 'ThinkPad X1 Carbon Gen 11', sku: 'LAP-TP-X1', description: 'Ultralight business laptop, Intel Core i7, 16GB RAM, 1TB SSD', category: 'Laptops', brand: 'Lenovo', purchasePrice: 95000, sellingPrice: 135000, minimumStockLevel: 20, reorderQuantity: 50, barcode: '8901234567891' },
    { name: 'Dell XPS 15 9530', sku: 'LAP-XPS-15', description: '15.6-inch OLED 3.5K, i9, RTX 4060, 32GB RAM', category: 'Laptops', brand: 'Dell', purchasePrice: 140000, sellingPrice: 189990, minimumStockLevel: 10, reorderQuantity: 30, barcode: '8901234567892' },
    { name: 'iPhone 15 Pro Max 256GB', sku: 'MOB-IPH-15P', description: 'Titanium, A17 Pro chip, 48MP camera', category: 'Mobile Phones', brand: 'Apple', purchasePrice: 110000, sellingPrice: 159900, minimumStockLevel: 25, reorderQuantity: 60, barcode: '8901234567893' },
    { name: 'Samsung Galaxy S24 Ultra', sku: 'MOB-SGS-24U', description: 'Galaxy AI, 200MP camera, S-Pen, Snapdragon 8 Gen 3', category: 'Mobile Phones', brand: 'Samsung', purchasePrice: 95000, sellingPrice: 129999, minimumStockLevel: 20, reorderQuantity: 50, barcode: '8901234567894' },
    { name: 'Sony WH-1000XM5', sku: 'AUD-SNY-XM5', description: 'Industry-leading noise cancellation', category: 'Audio', brand: 'Sony', purchasePrice: 21000, sellingPrice: 29990, minimumStockLevel: 15, reorderQuantity: 50, barcode: '8901234567895' },
    { name: 'Apple AirPods Pro (2nd Gen)', sku: 'AUD-APP-PRO', description: 'ANC, Adaptive Audio, USB-C MagSafe', category: 'Audio', brand: 'Apple', purchasePrice: 16000, sellingPrice: 24900, minimumStockLevel: 30, reorderQuantity: 80, barcode: '8901234567896' },
    { name: 'Logitech MX Master 3S', sku: 'ACC-LOG-MX3S', description: 'Quiet click mouse, 8K DPI', category: 'Accessories', brand: 'Logitech', purchasePrice: 6500, sellingPrice: 9995, minimumStockLevel: 40, reorderQuantity: 100, barcode: '8901234567897' },
    { name: 'Keychron Q1 Pro Wireless', sku: 'ACC-KCH-Q1P', description: '75% aluminum wireless mechanical keyboard', category: 'Keyboards', brand: 'Keychron', purchasePrice: 12000, sellingPrice: 17999, minimumStockLevel: 15, reorderQuantity: 40, barcode: '8901234567898' },
    { name: 'LG UltraFine 27-inch 4K UHD', sku: 'MON-LG-274K', description: 'IPS HDR400, USB-C 90W PD, ergonomic stand', category: 'Monitors', brand: 'LG', purchasePrice: 25000, sellingPrice: 34999, minimumStockLevel: 12, reorderQuantity: 30, barcode: '8901234567899' },
  ]);

  /* Marketplaces */
  const marketplaces = await Marketplace.create([
    { name: 'Amazon', code: 'amazon', status: 'CONNECTED', isSimulated: true, settings: { safetyBufferPercentage: 5, autoSync: true, lastSyncAt: new Date() } },
    { name: 'Flipkart', code: 'flipkart', status: 'CONNECTED', isSimulated: true, settings: { safetyBufferPercentage: 5, autoSync: true, lastSyncAt: new Date() } },
    { name: 'Meesho', code: 'meesho', status: 'CONNECTED', isSimulated: true, settings: { safetyBufferPercentage: 0, autoSync: true, lastSyncAt: new Date() } },
    { name: 'Shopify', code: 'shopify', status: 'CONNECTED', isSimulated: true, settings: { safetyBufferPercentage: 0, autoSync: true, lastSyncAt: new Date() } },
  ]);

  /* Stock Distribution */
  const dists = [
    { sku: 'LAP-MBP-16', delhi: 60, mumbai: 40, blr: 25 },
    { sku: 'LAP-TP-X1', delhi: 45, mumbai: 35, blr: 20 },
    { sku: 'LAP-XPS-15', delhi: 25, mumbai: 15, blr: 10 },
    { sku: 'MOB-IPH-15P', delhi: 70, mumbai: 55, blr: 45 },
    { sku: 'MOB-SGS-24U', delhi: 50, mumbai: 40, blr: 30 },
    { sku: 'AUD-SNY-XM5', delhi: 80, mumbai: 60, blr: 40 },
    { sku: 'AUD-APP-PRO', delhi: 100, mumbai: 75, blr: 50 },
    { sku: 'ACC-LOG-MX3S', delhi: 120, mumbai: 90, blr: 60 },
    { sku: 'ACC-KCH-Q1P', delhi: 40, mumbai: 30, blr: 20 },
    { sku: 'MON-LG-274K', delhi: 35, mumbai: 25, blr: 15 },
  ];

  for (const d of dists) {
    const prod = products.find(p => p.sku === d.sku);
    if (!prod) continue;
    for (const [wh, qty] of [[whDelhi, d.delhi], [whMumbai, d.mumbai], [whBangalore, d.blr]]) {
      const reserved = Math.round(qty * 0.05);
      const damaged = Math.round(qty * 0.02);
      const available = qty - reserved - damaged;
      await Inventory.create({ productId: prod._id, warehouseId: wh._id, physicalStock: qty, reservedStock: reserved, damagedStock: damaged, inTransitStock: 0, availableStock: available });
      await InventoryTransaction.create({ productId: prod._id, warehouseId: wh._id, transactionType: 'STOCK_IN', quantity: qty, previousStock: { physical: 0, reserved: 0, available: 0 }, updatedStock: { physical: qty, reserved, available }, source: 'AUDIT', performedBy: superAdmin._id, notes: `Initial opening balance for ${wh.name}` });
    }
    for (const mp of marketplaces) {
      const total = d.delhi + d.mumbai + d.blr;
      await MarketplaceListing.create({ productId: prod._id, marketplaceId: mp._id, internalSKU: prod.sku, externalSKU: `${mp.code.toUpperCase()}-${prod.sku}`, externalProductId: `${mp.code.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`, channelAllocatedStock: total, lastPublishedStock: total, syncStatus: 'IN_SYNC', lastSyncedAt: new Date() });
    }
  }

  /* Sample Orders */
  const [amz, flp, msh, shp] = marketplaces;
  await Order.create([
    { orderId: 'ORD-2026-1001', marketplaceOrderId: 'AMZ-402-9182374-1293812', marketplaceId: amz._id, items: [{ productId: products[0]._id, sku: products[0].sku, quantity: 2, unitPrice: products[0].sellingPrice, allocatedWarehouseId: whDelhi._id, isReserved: true }], totalAmount: products[0].sellingPrice * 2, orderStatus: 'CONFIRMED', customer: { name: 'Aarav Mehta', email: 'aarav.mehta@gmail.com', phone: '9820123456', shippingAddress: { city: 'Delhi', state: 'Delhi', pincode: '110001' } } },
    { orderId: 'ORD-2026-1002', marketplaceOrderId: 'FLP-OD829371928471', marketplaceId: flp._id, items: [{ productId: products[3]._id, sku: products[3].sku, quantity: 1, unitPrice: products[3].sellingPrice, allocatedWarehouseId: whMumbai._id, isReserved: true }], totalAmount: products[3].sellingPrice, orderStatus: 'PROCESSING', customer: { name: 'Sneha Kulkarni', email: 'sneha.k@outlook.com', phone: '9821234567', shippingAddress: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } } },
    { orderId: 'ORD-2026-1003', marketplaceOrderId: 'MSH-SUB-8291039', marketplaceId: msh._id, items: [{ productId: products[5]._id, sku: products[5].sku, quantity: 3, unitPrice: products[5].sellingPrice, allocatedWarehouseId: whBangalore._id, isReserved: true }], totalAmount: products[5].sellingPrice * 3, orderStatus: 'SHIPPED', customer: { name: 'Karthik Rao', email: 'karthik.rao@yahoo.com', phone: '9845123456', shippingAddress: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' } } },
    { orderId: 'ORD-2026-1004', marketplaceOrderId: 'SHP-#4892', marketplaceId: shp._id, items: [{ productId: products[7]._id, sku: products[7].sku, quantity: 5, unitPrice: products[7].sellingPrice, allocatedWarehouseId: whDelhi._id, isReserved: false }], totalAmount: products[7].sellingPrice * 5, orderStatus: 'DELIVERED', customer: { name: 'Ananya Deshmukh', email: 'ananya.d@gmail.com', phone: '9819123456', shippingAddress: { city: 'Pune', state: 'Maharashtra', pincode: '411001' } } },
  ]);

  /* Sample Transfer */
  await StockTransfer.create([{
    transferNumber: 'TRF-2026-001', productId: products[0]._id, sourceWarehouseId: whDelhi._id,
    destinationWarehouseId: whMumbai._id, quantity: 10, status: 'IN_TRANSIT',
    requestedBy: whMumbaiMgr._id, approvedBy: invManager._id,
    dispatchedAt: new Date(Date.now() - 86400000),
    notes: 'Replenishing Western Hub high-demand MacBook inventory',
  }]);

  console.log('[Seeder] ✅ Database seeded successfully!');
  console.log('──────────────────────────────────────────');
  console.log('Demo Logins:');
  console.log('  admin@cims.com       / Admin@123  (Super Admin)');
  console.log('  inventory@cims.com   / Admin@123  (Inventory Manager)');
  console.log('  sales@cims.com       / Admin@123  (Sales Manager)');
  console.log('──────────────────────────────────────────');
};

/* ─── Main Startup ─── */
const startServer = async () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   CIMS — Nexus Inventory Dev Startup     ║');
  console.log('╚══════════════════════════════════════════╝');

  // 1. Start in-memory MongoDB
  console.log('\n[1/4] Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  console.log(`      ✓ MongoDB ready at ${uri}`);

  // 2. Connect
  console.log('[2/4] Connecting backend to MongoDB...');
  await connectDB();

  // 3. Seed data
  console.log('[3/4] Seeding sample data...');
  await seedDatabase();

  // 4. Start server
  console.log('[4/4] Starting Express + Socket.IO server...');
  const server = http.createServer(app);
  initSocket(server);
  startOutboxWorker(4000);

  server.listen(PORT, () => {
    console.log(`\n[CIMS Backend] ✅ Server running → http://localhost:${PORT}`);
    console.log(`[CIMS Backend] Health check   → http://localhost:${PORT}/api/v1/health`);
    console.log('[CIMS Backend] Waiting for requests...\n');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[CIMS] Shutting down gracefully...');
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
