const mongoose = require('mongoose');
const { Inventory, InventoryTransaction, Product, Warehouse } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventory.service');
const syncService = require('../services/sync.service');
const { DEMO_INVENTORY } = require('../utils/demoData');

const getInventory = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return new ApiResponse(200, 'Inventory records fetched (Demo Mode)', DEMO_INVENTORY).send(res, 200);
  }

  const { warehouseId, lowStockOnly } = req.query;

  const query = {};
  if (warehouseId) query.warehouseId = warehouseId;

  const records = await Inventory.find(query)
    .populate('productId')
    .populate('warehouseId');

  let results = records;
  if (lowStockOnly === 'true') {
    results = records.filter(
      (r) => r.productId && r.availableStock <= (r.productId.minimumStockLevel || 10)
    );
  }

  return new ApiResponse(200, 'Inventory records fetched', results).send(res, 200);
});

const getInventoryByProductId = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const records = await Inventory.find({ productId }).populate('warehouseId');
  const totals = await inventoryService.getTotalStock(productId);

  return new ApiResponse(200, 'Product inventory fetched', {
    productId,
    warehouseBreakdown: records,
    totals,
  }).send(res, 200);
});

const getInventoryByWarehouseId = asyncHandler(async (req, res) => {
  const { warehouseId } = req.params;
  const records = await Inventory.find({ warehouseId }).populate('productId');

  return new ApiResponse(200, 'Warehouse inventory fetched', records).send(res, 200);
});

const adjustStock = asyncHandler(async (req, res) => {
  const { productId, warehouseId, newPhysicalStock, newDamagedStock, reason } = req.body;

  const result = await inventoryService.adjustStock({
    productId,
    warehouseId,
    newPhysicalStock,
    newDamagedStock,
    reason,
    performedBy: req.user?._id,
  });

  // Sync to all marketplaces in background
  syncService.syncProductToAllMarketplaces(productId).catch((err) => {
    console.error('Marketplace sync error after adjustment:', err.message);
  });

  return new ApiResponse(200, 'Stock adjusted successfully', result).send(res, 200);
});

const stockIn = asyncHandler(async (req, res) => {
  const { productId, warehouseId, quantity, notes } = req.body;

  const result = await inventoryService.stockIn({
    productId,
    warehouseId,
    quantity: Number(quantity),
    performedBy: req.user?._id,
    notes,
  });

  // Sync to all marketplaces in background
  syncService.syncProductToAllMarketplaces(productId).catch((err) => {
    console.error('Marketplace sync error after stockIn:', err.message);
  });

  return new ApiResponse(200, 'Stock received successfully', result).send(res, 200);
});

const stockOut = asyncHandler(async (req, res) => {
  const { productId, warehouseId, quantity, notes } = req.body;

  const result = await inventoryService.stockOut({
    productId,
    warehouseId,
    quantity: Number(quantity),
    isReserved: false,
    performedBy: req.user?._id,
  });

  // Sync to all marketplaces in background
  syncService.syncProductToAllMarketplaces(productId).catch((err) => {
    console.error('Marketplace sync error after stockOut:', err.message);
  });

  return new ApiResponse(200, 'Stock dispatched successfully', result).send(res, 200);
});

const getTransactions = asyncHandler(async (req, res) => {
  const { productId, warehouseId, transactionType, limit = 50 } = req.query;

  const query = {};
  if (productId) query.productId = productId;
  if (warehouseId) query.warehouseId = warehouseId;
  if (transactionType) query.transactionType = transactionType;

  const transactions = await InventoryTransaction.find(query)
    .populate('productId', 'name sku image')
    .populate('warehouseId', 'name warehouseCode')
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  return new ApiResponse(200, 'Transactions history fetched', transactions).send(res, 200);
});

const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true });
  const lowStockItems = [];

  for (const prod of products) {
    const stock = await inventoryService.getTotalStock(prod._id);
    if (stock.availableStock <= prod.minimumStockLevel) {
      lowStockItems.push({
        productId: prod._id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        brand: prod.brand,
        image: prod.image,
        availableStock: stock.availableStock,
        physicalStock: stock.physicalStock,
        reservedStock: stock.reservedStock,
        minimumStockLevel: prod.minimumStockLevel,
        reorderQuantity: prod.reorderQuantity,
      });
    }
  }

  return new ApiResponse(200, 'Low stock products fetched', lowStockItems).send(res, 200);
});

module.exports = {
  getInventory,
  getInventoryByProductId,
  getInventoryByWarehouseId,
  adjustStock,
  stockIn,
  stockOut,
  getTransactions,
  getLowStock,
};
