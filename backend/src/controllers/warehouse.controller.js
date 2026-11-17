const mongoose = require('mongoose');
const { Warehouse, Inventory, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { DEMO_WAREHOUSES } = require('../utils/demoData');

const createWarehouse = asyncHandler(async (req, res) => {
  const { warehouseCode, name, address, managerId, capacity, priority } = req.body;

  const existing = await Warehouse.findOne({ warehouseCode: warehouseCode.toUpperCase() });
  if (existing) {
    throw new ApiError(400, `Warehouse code ${warehouseCode} already exists`);
  }

  const warehouse = new Warehouse({
    warehouseCode: warehouseCode.toUpperCase(),
    name,
    address,
    managerId,
    capacity,
    priority: priority || 1,
  });

  await warehouse.save();

  // Create zero-inventory records for all existing active products
  const products = await Product.find({ isActive: true });
  for (const prod of products) {
    await Inventory.create({
      productId: prod._id,
      warehouseId: warehouse._id,
      physicalStock: 0,
      reservedStock: 0,
      damagedStock: 0,
      inTransitStock: 0,
      availableStock: 0,
    });
  }

  return new ApiResponse(201, 'Warehouse created successfully', warehouse).send(res, 201);
});

const getWarehouses = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return new ApiResponse(200, 'Warehouses fetched (Demo Mode)', DEMO_WAREHOUSES).send(res, 200);
  }

  const warehouses = await Warehouse.find().populate('managerId', 'name email');

  // Compute live utilization for each warehouse
  const enriched = await Promise.all(
    warehouses.map(async (wh) => {
      const invs = await Inventory.find({ warehouseId: wh._id });
      const currentPhysical = invs.reduce((sum, i) => sum + i.physicalStock, 0);
      const utilizationPct = wh.capacity > 0 ? Math.round((currentPhysical / wh.capacity) * 100) : 0;

      return {
        ...wh.toObject(),
        currentPhysicalStock: currentPhysical,
        utilizationPercentage: utilizationPct,
        skuCount: invs.filter((i) => i.physicalStock > 0).length,
      };
    })
  );

  return new ApiResponse(200, 'Warehouses fetched successfully', enriched).send(res, 200);
});

const getWarehouseById = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id).populate('managerId', 'name email');
  if (!warehouse) throw new ApiError(404, 'Warehouse not found');

  return new ApiResponse(200, 'Warehouse details', warehouse).send(res, 200);
});

const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!warehouse) throw new ApiError(404, 'Warehouse not found');

  return new ApiResponse(200, 'Warehouse updated successfully', warehouse).send(res, 200);
});

const getWarehouseInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventories = await Inventory.find({ warehouseId: id }).populate('productId');

  return new ApiResponse(200, 'Warehouse inventory fetched', inventories).send(res, 200);
});

const getWarehouseCapacity = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) throw new ApiError(404, 'Warehouse not found');

  const inventories = await Inventory.find({ warehouseId: warehouse._id });
  const totalPhysicalStock = inventories.reduce((sum, item) => sum + item.physicalStock, 0);
  const utilizationPercentage = Math.round((totalPhysicalStock / warehouse.capacity) * 100);

  return new ApiResponse(200, 'Warehouse capacity metrics', {
    warehouseId: warehouse._id,
    warehouseCode: warehouse.warehouseCode,
    totalCapacity: warehouse.capacity,
    currentUtilization: totalPhysicalStock,
    availableCapacity: Math.max(0, warehouse.capacity - totalPhysicalStock),
    utilizationPercentage,
  }).send(res, 200);
});

module.exports = {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  getWarehouseInventory,
  getWarehouseCapacity,
};
