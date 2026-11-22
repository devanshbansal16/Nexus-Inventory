const { StockTransfer, Inventory, InventoryTransaction, Product, Warehouse } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { emitInventoryUpdate } = require('../sockets/socketHandler');

const createTransfer = asyncHandler(async (req, res) => {
  const { productId, sourceWarehouseId, destinationWarehouseId, quantity, notes } = req.body;

  if (String(sourceWarehouseId) === String(destinationWarehouseId)) {
    throw new ApiError(400, 'Source and destination warehouses cannot be the same');
  }

  const sourceInv = await Inventory.findOne({ productId, warehouseId: sourceWarehouseId });
  if (!sourceInv || sourceInv.availableStock < quantity) {
    throw new ApiError(
      400,
      `Insufficient available stock in source warehouse. Available: ${sourceInv ? sourceInv.availableStock : 0}, Requested: ${quantity}`
    );
  }

  const transferNumber = `TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const transfer = new StockTransfer({
    transferNumber,
    productId,
    sourceWarehouseId,
    destinationWarehouseId,
    quantity: Number(quantity),
    status: 'REQUESTED',
    requestedBy: req.user._id,
    notes,
  });

  await transfer.save();

  return new ApiResponse(201, 'Stock transfer request created', transfer).send(res, 201);
});

const getTransfers = asyncHandler(async (req, res) => {
  const { status, sourceWarehouseId, destinationWarehouseId } = req.query;

  const query = {};
  if (status) query.status = status.toUpperCase();
  if (sourceWarehouseId) query.sourceWarehouseId = sourceWarehouseId;
  if (destinationWarehouseId) query.destinationWarehouseId = destinationWarehouseId;

  const transfers = await StockTransfer.find(query)
    .populate('productId', 'name sku image')
    .populate('sourceWarehouseId', 'name warehouseCode')
    .populate('destinationWarehouseId', 'name warehouseCode')
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  return new ApiResponse(200, 'Stock transfers fetched', transfers).send(res, 200);
});

const getTransferById = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id)
    .populate('productId')
    .populate('sourceWarehouseId')
    .populate('destinationWarehouseId')
    .populate('requestedBy')
    .populate('approvedBy');

  if (!transfer) throw new ApiError(404, 'Stock transfer not found');

  return new ApiResponse(200, 'Transfer details', transfer).send(res, 200);
});

const approveTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');

  if (transfer.status !== 'REQUESTED') {
    throw new ApiError(400, `Cannot approve transfer in status ${transfer.status}`);
  }

  // Reserve stock in source warehouse
  const sourceInv = await Inventory.findOne({
    productId: transfer.productId,
    warehouseId: transfer.sourceWarehouseId,
  });

  if (!sourceInv || sourceInv.availableStock < transfer.quantity) {
    throw new ApiError(400, 'Source warehouse does not have enough available stock');
  }

  sourceInv.reservedStock += transfer.quantity;
  sourceInv.availableStock -= transfer.quantity;
  await sourceInv.save();

  transfer.status = 'APPROVED';
  transfer.approvedBy = req.user._id;
  await transfer.save();

  return new ApiResponse(200, 'Stock transfer approved and source stock reserved', transfer).send(
    res,
    200
  );
});

const dispatchTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');

  if (transfer.status !== 'APPROVED') {
    throw new ApiError(400, `Cannot dispatch transfer in status ${transfer.status}`);
  }

  // Deduct from source warehouse physical & reserved, add to destination inTransitStock
  const sourceInv = await Inventory.findOne({
    productId: transfer.productId,
    warehouseId: transfer.sourceWarehouseId,
  });

  sourceInv.physicalStock -= transfer.quantity;
  sourceInv.reservedStock -= transfer.quantity;
  await sourceInv.save();

  // Find or create destination inventory record
  let destInv = await Inventory.findOne({
    productId: transfer.productId,
    warehouseId: transfer.destinationWarehouseId,
  });

  if (!destInv) {
    destInv = new Inventory({
      productId: transfer.productId,
      warehouseId: transfer.destinationWarehouseId,
      physicalStock: 0,
      reservedStock: 0,
      damagedStock: 0,
      inTransitStock: 0,
      availableStock: 0,
    });
  }

  destInv.inTransitStock += transfer.quantity;
  await destInv.save();

  // Record transaction
  await InventoryTransaction.create({
    productId: transfer.productId,
    warehouseId: transfer.sourceWarehouseId,
    transactionType: 'TRANSFER_DISPATCH',
    quantity: transfer.quantity,
    source: 'TRANSFER',
    referenceId: transfer.transferNumber,
    performedBy: req.user._id,
    notes: `Dispatched ${transfer.quantity} units to destination warehouse`,
  });

  transfer.status = 'IN_TRANSIT';
  transfer.dispatchedAt = new Date();
  await transfer.save();

  emitInventoryUpdate({
    productId: transfer.productId,
    action: 'TRANSFER_DISPATCH',
  });

  return new ApiResponse(200, 'Stock transfer dispatched and moved into transit', transfer).send(
    res,
    200
  );
});

const receiveTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');

  if (transfer.status !== 'IN_TRANSIT') {
    throw new ApiError(400, `Cannot receive transfer in status ${transfer.status}`);
  }

  // Update destination warehouse: deduct inTransitStock, add to physicalStock & availableStock
  const destInv = await Inventory.findOne({
    productId: transfer.productId,
    warehouseId: transfer.destinationWarehouseId,
  });

  if (!destInv) throw new ApiError(500, 'Destination inventory record not found');

  destInv.inTransitStock = Math.max(0, destInv.inTransitStock - transfer.quantity);
  destInv.physicalStock += transfer.quantity;
  destInv.availableStock += transfer.quantity;
  await destInv.save();

  // Record transaction
  await InventoryTransaction.create({
    productId: transfer.productId,
    warehouseId: transfer.destinationWarehouseId,
    transactionType: 'TRANSFER_RECEIVE',
    quantity: transfer.quantity,
    source: 'TRANSFER',
    referenceId: transfer.transferNumber,
    performedBy: req.user._id,
    notes: `Received ${transfer.quantity} units from transfer ${transfer.transferNumber}`,
  });

  transfer.status = 'RECEIVED';
  transfer.receivedAt = new Date();
  await transfer.save();

  emitInventoryUpdate({
    productId: transfer.productId,
    action: 'TRANSFER_RECEIVE',
  });

  return new ApiResponse(200, 'Stock received at destination warehouse', transfer).send(res, 200);
});

module.exports = {
  createTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  dispatchTransfer,
  receiveTransfer,
};
