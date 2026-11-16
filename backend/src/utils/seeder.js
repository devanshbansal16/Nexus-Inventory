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

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cims';
    await mongoose.connect(mongoUri);
    console.log(`[Seeder] MongoDB Connected: ${mongoUri}`);
  } catch (err) {
    console.error('[Seeder] MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

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

  console.log('[Seeder] Creating Users...');
  // Users (Super Admin, Inventory Manager, Warehouse Managers, Sales Manager)
  const users = await User.create([
    {
      name: 'Aditi Sharma (Super Admin)',
      email: 'admin@cims.com',
      passwordHash: 'Admin@123',
      role: 'super_admin',
      isActive: true,
    },
    {
      name: 'Rajesh Verma (Inventory Manager)',
      email: 'inventory@cims.com',
      passwordHash: 'Admin@123',
      role: 'inventory_manager',
      isActive: true,
    },
    {
      name: 'Vikram Singh (Delhi Warehouse Mgr)',
      email: 'warehouse.delhi@cims.com',
      passwordHash: 'Admin@123',
      role: 'warehouse_manager',
      isActive: true,
    },
    {
      name: 'Pooja Nair (Mumbai Warehouse Mgr)',
      email: 'warehouse.mumbai@cims.com',
      passwordHash: 'Admin@123',
      role: 'warehouse_manager',
      isActive: true,
    },
    {
      name: 'Suresh Patel (Sales Manager)',
      email: 'sales@cims.com',
      passwordHash: 'Admin@123',
      role: 'sales_manager',
      isActive: true,
    },
  ]);

  const [superAdmin, invManager, whDelhiMgr, whMumbaiMgr, salesMgr] = users;

  console.log('[Seeder] Creating Warehouses...');
  // 3 Warehouses (Delhi, Mumbai, Bangalore)
  const warehouses = await Warehouse.create([
    {
      warehouseCode: 'WH-DEL-01',
      name: 'Delhi Northern Hub',
      address: {
        street: 'Okhla Industrial Area Phase III',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110020',
      },
      managerId: whDelhiMgr._id,
      capacity: 5000,
      priority: 1,
    },
    {
      warehouseCode: 'WH-BOM-02',
      name: 'Mumbai Western Hub',
      address: {
        street: 'Bhiwandi Logistics Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '421302',
      },
      managerId: whMumbaiMgr._id,
      capacity: 4500,
      priority: 2,
    },
    {
      warehouseCode: 'WH-BLR-03',
      name: 'Bangalore Southern Hub',
      address: {
        street: 'Whitefield Industrial Corridor',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        pincode: '560066',
      },
      managerId: invManager._id,
      capacity: 4000,
      priority: 3,
    },
  ]);

  const [whDelhi, whMumbai, whBangalore] = warehouses;

  // Update manager's assigned warehouse
  await User.findByIdAndUpdate(whDelhiMgr._id, { assignedWarehouses: [whDelhi._id] });
  await User.findByIdAndUpdate(whMumbaiMgr._id, { assignedWarehouses: [whMumbai._id] });

  console.log('[Seeder] Creating 10 Sample Products...');
  // 10 Products across categories
  const products = await Product.create([
    {
      name: 'MacBook Pro 16 M3 Max',
      sku: 'LAP-MBP-16',
      description: '16-inch Liquid Retina XDR display, 36GB Unified Memory, 512GB SSD Storage',
      category: 'Laptops',
      brand: 'Apple',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567890',
      purchasePrice: 180000,
      sellingPrice: 249900,
      minimumStockLevel: 15,
      reorderQuantity: 40,
    },
    {
      name: 'ThinkPad X1 Carbon Gen 11',
      sku: 'LAP-TP-X1',
      description: 'Ultralight business laptop with Intel Core i7 13th Gen, 16GB RAM, 1TB SSD',
      category: 'Laptops',
      brand: 'Lenovo',
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567891',
      purchasePrice: 95000,
      sellingPrice: 135000,
      minimumStockLevel: 20,
      reorderQuantity: 50,
    },
    {
      name: 'Dell XPS 15 9530',
      sku: 'LAP-XPS-15',
      description: '15.6-inch OLED 3.5K touch display, Intel i9, NVIDIA RTX 4060, 32GB RAM',
      category: 'Laptops',
      brand: 'Dell',
      image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567892',
      purchasePrice: 140000,
      sellingPrice: 189990,
      minimumStockLevel: 10,
      reorderQuantity: 30,
    },
    {
      name: 'iPhone 15 Pro Max 256GB',
      sku: 'MOB-IPH-15P',
      description: 'Titanium design with A17 Pro chip, 48MP main camera, 5x telephoto optical zoom',
      category: 'Mobile Phones',
      brand: 'Apple',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567893',
      purchasePrice: 110000,
      sellingPrice: 159900,
      minimumStockLevel: 25,
      reorderQuantity: 60,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'MOB-SGS-24U',
      description: 'Galaxy AI, 200MP camera, built-in S-Pen, Snapdragon 8 Gen 3 processor',
      category: 'Mobile Phones',
      brand: 'Samsung',
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567894',
      purchasePrice: 95000,
      sellingPrice: 129999,
      minimumStockLevel: 20,
      reorderQuantity: 50,
    },
    {
      name: 'Sony WH-1000XM5 Noise Cancelling',
      sku: 'AUD-SNY-XM5',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones',
      category: 'Audio',
      brand: 'Sony',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567895',
      purchasePrice: 21000,
      sellingPrice: 29990,
      minimumStockLevel: 15,
      reorderQuantity: 50,
    },
    {
      name: 'Apple AirPods Pro (2nd Gen)',
      sku: 'AUD-APP-PRO',
      description: 'Active Noise Cancellation, Adaptive Audio, USB-C MagSafe Charging Case',
      category: 'Audio',
      brand: 'Apple',
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567896',
      purchasePrice: 16000,
      sellingPrice: 24900,
      minimumStockLevel: 30,
      reorderQuantity: 80,
    },
    {
      name: 'Logitech MX Master 3S Wireless',
      sku: 'ACC-LOG-MX3S',
      description: 'Quiet click performance mouse with 8K DPI tracking on any surface',
      category: 'Accessories',
      brand: 'Logitech',
      image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567897',
      purchasePrice: 6500,
      sellingPrice: 9995,
      minimumStockLevel: 40,
      reorderQuantity: 100,
    },
    {
      name: 'Keychron Q1 Pro Wireless Mechanical',
      sku: 'ACC-KCH-Q1P',
      description: 'Full aluminum 75% layout custom wireless mechanical keyboard with knob',
      category: 'Keyboards',
      brand: 'Keychron',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567898',
      purchasePrice: 12000,
      sellingPrice: 17999,
      minimumStockLevel: 15,
      reorderQuantity: 40,
    },
    {
      name: 'LG UltraFine 27-inch 4K UHD',
      sku: 'MON-LG-274K',
      description: 'IPS Display with HDR400, USB Type-C 90W power delivery, ergonomic stand',
      category: 'Monitors',
      brand: 'LG',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
      barcode: '8901234567899',
      purchasePrice: 25000,
      sellingPrice: 34999,
      minimumStockLevel: 12,
      reorderQuantity: 30,
    },
  ]);

  console.log('[Seeder] Creating Marketplaces...');
  // 4 Simulated Marketplaces + Company Website
  const marketplaces = await Marketplace.create([
    {
      name: 'Amazon',
      code: 'amazon',
      status: 'CONNECTED',
      isSimulated: true,
      settings: { safetyBufferPercentage: 5, autoSync: true, lastSyncAt: new Date() },
    },
    {
      name: 'Flipkart',
      code: 'flipkart',
      status: 'CONNECTED',
      isSimulated: true,
      settings: { safetyBufferPercentage: 5, autoSync: true, lastSyncAt: new Date() },
    },
    {
      name: 'Meesho',
      code: 'meesho',
      status: 'CONNECTED',
      isSimulated: true,
      settings: { safetyBufferPercentage: 0, autoSync: true, lastSyncAt: new Date() },
    },
    {
      name: 'Shopify',
      code: 'shopify',
      status: 'CONNECTED',
      isSimulated: true,
      settings: { safetyBufferPercentage: 0, autoSync: true, lastSyncAt: new Date() },
    },
  ]);

  console.log('[Seeder] Distributing Stock across Warehouses...');
  // Assign stock for each product across the 3 warehouses
  const stockDistributions = [
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

  for (const dist of stockDistributions) {
    const prod = products.find((p) => p.sku === dist.sku);
    if (!prod) continue;

    const allocations = [
      { wh: whDelhi, qty: dist.delhi },
      { wh: whMumbai, qty: dist.mumbai },
      { wh: whBangalore, qty: dist.blr },
    ];

    for (const alloc of allocations) {
      const physical = alloc.qty;
      const reserved = Math.round(physical * 0.05); // 5% currently reserved
      const damaged = Math.round(physical * 0.02);  // 2% damaged
      const available = physical - reserved - damaged;

      await Inventory.create({
        productId: prod._id,
        warehouseId: alloc.wh._id,
        physicalStock: physical,
        reservedStock: reserved,
        damagedStock: damaged,
        inTransitStock: 0,
        availableStock: available,
      });

      // Record initial stock transaction
      await InventoryTransaction.create({
        productId: prod._id,
        warehouseId: alloc.wh._id,
        transactionType: 'STOCK_IN',
        quantity: physical,
        previousStock: { physical: 0, reserved: 0, available: 0 },
        updatedStock: { physical, reserved, available },
        source: 'AUDIT',
        performedBy: superAdmin._id,
        notes: `Initial opening balance seeded for ${alloc.wh.name}`,
      });
    }

    // Map product to all 4 marketplaces
    for (const mp of marketplaces) {
      const totalAvailable = dist.delhi + dist.mumbai + dist.blr;
      await MarketplaceListing.create({
        productId: prod._id,
        marketplaceId: mp._id,
        internalSKU: prod.sku,
        externalSKU: `${mp.code.toUpperCase()}-${prod.sku}`,
        externalProductId: `${mp.code.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        channelAllocatedStock: totalAvailable,
        lastPublishedStock: totalAvailable,
        syncStatus: 'IN_SYNC',
        lastSyncedAt: new Date(),
      });
    }
  }

  console.log('[Seeder] Creating Sample Orders...');
  // Sample orders across marketplaces
  const [amz, flp, msh, shp] = marketplaces;
  const sampleOrdersData = [
    {
      orderId: 'ORD-2026-1001',
      marketplaceOrderId: 'AMZ-402-9182374-1293812',
      marketplaceId: amz._id,
      items: [
        {
          productId: products[0]._id,
          sku: products[0].sku,
          quantity: 2,
          unitPrice: products[0].sellingPrice,
          allocatedWarehouseId: whDelhi._id,
          isReserved: true,
        },
      ],
      totalAmount: products[0].sellingPrice * 2,
      orderStatus: 'CONFIRMED',
      customer: {
        name: 'Aarav Mehta',
        email: 'aarav.mehta@gmail.com',
        phone: '9820123456',
        shippingAddress: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
      },
    },
    {
      orderId: 'ORD-2026-1002',
      marketplaceOrderId: 'FLP-OD829371928471',
      marketplaceId: flp._id,
      items: [
        {
          productId: products[3]._id,
          sku: products[3].sku,
          quantity: 1,
          unitPrice: products[3].sellingPrice,
          allocatedWarehouseId: whMumbai._id,
          isReserved: true,
        },
      ],
      totalAmount: products[3].sellingPrice,
      orderStatus: 'PROCESSING',
      customer: {
        name: 'Sneha Kulkarni',
        email: 'sneha.k@outlook.com',
        phone: '9821234567',
        shippingAddress: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      },
    },
    {
      orderId: 'ORD-2026-1003',
      marketplaceOrderId: 'MSH-SUB-8291039',
      marketplaceId: msh._id,
      items: [
        {
          productId: products[5]._id,
          sku: products[5].sku,
          quantity: 3,
          unitPrice: products[5].sellingPrice,
          allocatedWarehouseId: whBangalore._id,
          isReserved: true,
        },
      ],
      totalAmount: products[5].sellingPrice * 3,
      orderStatus: 'SHIPPED',
      customer: {
        name: 'Karthik Rao',
        email: 'karthik.rao@yahoo.com',
        phone: '9845123456',
        shippingAddress: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      },
    },
    {
      orderId: 'ORD-2026-1004',
      marketplaceOrderId: 'SHP-#4892',
      marketplaceId: shp._id,
      items: [
        {
          productId: products[7]._id,
          sku: products[7].sku,
          quantity: 5,
          unitPrice: products[7].sellingPrice,
          allocatedWarehouseId: whDelhi._id,
          isReserved: false,
        },
      ],
      totalAmount: products[7].sellingPrice * 5,
      orderStatus: 'DELIVERED',
      customer: {
        name: 'Ananya Deshmukh',
        email: 'ananya.d@gmail.com',
        phone: '9819123456',
        shippingAddress: { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    },
  ];

  await Order.create(sampleOrdersData);

  console.log('[Seeder] Creating Sample Stock Transfers...');
  await StockTransfer.create([
    {
      transferNumber: 'TRF-2026-001',
      productId: products[0]._id,
      sourceWarehouseId: whDelhi._id,
      destinationWarehouseId: whMumbai._id,
      quantity: 10,
      status: 'IN_TRANSIT',
      requestedBy: whMumbaiMgr._id,
      approvedBy: invManager._id,
      dispatchedAt: new Date(Date.now() - 86400000),
      notes: 'Replenishing Western Hub high-demand MacBook inventory',
    },
  ]);

  console.log('[Seeder] Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Seeded Users:');
  console.log('• Super Admin:       admin@cims.com / Admin@123');
  console.log('• Inventory Manager: inventory@cims.com / Admin@123');
  console.log('• Warehouse Delhi:   warehouse.delhi@cims.com / Admin@123');
  console.log('• Warehouse Mumbai:  warehouse.mumbai@cims.com / Admin@123');
  console.log('• Sales Manager:     sales@cims.com / Admin@123');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
};

seedData().catch((err) => {
  console.error('[Seeder] Fatal execution error:', err);
  process.exit(1);
});
