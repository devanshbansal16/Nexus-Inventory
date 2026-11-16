const {
  Product,
  Warehouse,
  Inventory,
  Order,
  Marketplace,
  InventoryTransaction,
} = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventory.service');

const getOverview = asyncHandler(async (req, res) => {
  // 1. Core KPIs
  const totalProducts = await Product.countDocuments({ isActive: true });
  const totalWarehouses = await Warehouse.countDocuments({ isActive: true });
  const totalOrders = await Order.countDocuments();

  // Aggregate sales total
  const salesAggregate = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'CANCELLED' } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ]);
  const totalSales = salesAggregate.length > 0 ? salesAggregate[0].totalRevenue : 0;

  // Aggregate stock across all inventory records
  const stockAggregate = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        totalPhysical: { $sum: '$physicalStock' },
        totalReserved: { $sum: '$reservedStock' },
        totalDamaged: { $sum: '$damagedStock' },
        totalAvailable: { $sum: '$availableStock' },
      },
    },
  ]);

  const stockStats = stockAggregate[0] || {
    totalPhysical: 0,
    totalReserved: 0,
    totalDamaged: 0,
    totalAvailable: 0,
  };

  // 2. Low Stock Count & List
  const products = await Product.find({ isActive: true });
  const lowStockItems = [];

  for (const prod of products) {
    const stock = await inventoryService.getTotalStock(prod._id);
    if (stock.availableStock <= prod.minimumStockLevel) {
      lowStockItems.push({
        productId: prod._id,
        name: prod.name,
        sku: prod.sku,
        availableStock: stock.availableStock,
        minimumStockLevel: prod.minimumStockLevel,
        reorderQuantity: prod.reorderQuantity,
      });
    }
  }

  // 3. Recent Orders
  const recentOrders = await Order.find()
    .populate('marketplaceId', 'name code')
    .sort({ createdAt: -1 })
    .limit(5);

  // 4. Warehouse Stock Distribution for Charts
  const warehouses = await Warehouse.find({ isActive: true });
  const warehouseStock = await Promise.all(
    warehouses.map(async (wh) => {
      const invs = await Inventory.find({ warehouseId: wh._id });
      return {
        warehouse: wh.name,
        available: invs.reduce((sum, i) => sum + i.availableStock, 0),
        reserved: invs.reduce((sum, i) => sum + i.reservedStock, 0),
        damaged: invs.reduce((sum, i) => sum + i.damagedStock, 0),
      };
    })
  );

  // 5. Sales Trend for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyOrders = await Order.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $ne: 'CANCELLED' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Format 7 days sequence
  const salesTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const match = dailyOrders.find((item) => item._id === key);
    salesTrends.push({
      date: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      sales: match ? match.sales : 0,
      orders: match ? match.orders : 0,
    });
  }

  return new ApiResponse(200, 'Dashboard overview data fetched', {
    stats: {
      totalProducts,
      totalWarehouses,
      totalPhysicalStock: stockStats.totalPhysical,
      totalReservedStock: stockStats.totalReserved,
      totalAvailableStock: stockStats.totalAvailable,
      totalOrders,
      totalSales,
      lowStockCount: lowStockItems.length,
    },
    recentOrders,
    lowStockItems,
    salesTrends,
    warehouseStock,
  }).send(res, 200);
});

const getSalesAnalytics = asyncHandler(async (req, res) => {
  const salesByMarketplace = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'CANCELLED' } } },
    {
      $group: {
        _id: '$marketplaceId',
        totalRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'marketplaces',
        localField: '_id',
        foreignField: '_id',
        as: 'marketplace',
      },
    },
    { $unwind: '$marketplace' },
    {
      $project: {
        marketplace: '$marketplace.name',
        code: '$marketplace.code',
        totalRevenue: 1,
        orderCount: 1,
      },
    },
  ]);

  return new ApiResponse(200, 'Sales analytics fetched', salesByMarketplace).send(res, 200);
});

const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        sku: '$product.sku',
        category: '$product.category',
        image: '$product.image',
        totalQuantitySold: 1,
        totalRevenue: 1,
      },
    },
  ]);

  return new ApiResponse(200, 'Top selling products fetched', topProducts).send(res, 200);
});

const getWarehouseDistribution = asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.find({ isActive: true });
  const distribution = await Promise.all(
    warehouses.map(async (wh) => {
      const invs = await Inventory.find({ warehouseId: wh._id }).populate('productId');
      return {
        warehouseId: wh._id,
        warehouseName: wh.name,
        warehouseCode: wh.warehouseCode,
        capacity: wh.capacity,
        products: invs.map((i) => ({
          name: i.productId?.name,
          sku: i.productId?.sku,
          availableStock: i.availableStock,
          physicalStock: i.physicalStock,
        })),
      };
    })
  );

  return new ApiResponse(200, 'Warehouse inventory distribution', distribution).send(res, 200);
});

module.exports = {
  getOverview,
  getSalesAnalytics,
  getTopProducts,
  getWarehouseDistribution,
};
