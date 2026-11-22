const { Product, Inventory, MarketplaceListing, Warehouse } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventory.service');

const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    description,
    category,
    brand,
    image,
    barcode,
    purchasePrice,
    sellingPrice,
    minimumStockLevel,
    reorderQuantity,
    initialStockByWarehouse, // optional array: [{ warehouseId, quantity }]
  } = req.body;

  const existing = await Product.findOne({ sku: sku.toUpperCase() });
  if (existing) {
    throw new ApiError(400, `Product with SKU ${sku} already exists`);
  }

  const product = new Product({
    name,
    sku: sku.toUpperCase(),
    description,
    category,
    brand,
    image,
    barcode,
    purchasePrice,
    sellingPrice,
    minimumStockLevel: minimumStockLevel ?? 10,
    reorderQuantity: reorderQuantity ?? 50,
  });

  await product.save();

  // Initialize inventory records for all active warehouses
  const warehouses = await Warehouse.find({ isActive: true });
  for (const wh of warehouses) {
    const initStock =
      initialStockByWarehouse?.find((s) => String(s.warehouseId) === String(wh._id))?.quantity || 0;

    const inv = new Inventory({
      productId: product._id,
      warehouseId: wh._id,
      physicalStock: initStock,
      reservedStock: 0,
      damagedStock: 0,
      inTransitStock: 0,
      availableStock: initStock,
    });
    await inv.save();
  }

  return new ApiResponse(201, 'Product created successfully', product).send(res, 201);
});

const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, brand, sku } = req.query;

  const query = {};
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (sku) query.sku = sku.toUpperCase();

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

  // Attach total stock across warehouses to each product
  const enrichedProducts = await Promise.all(
    products.map(async (prod) => {
      const stock = await inventoryService.getTotalStock(prod._id);
      return {
        ...prod.toObject(),
        stock,
      };
    })
  );

  return new ApiResponse(200, 'Products fetched successfully', {
    products: enrichedProducts,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }).send(res, 200);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const inventories = await Inventory.find({ productId: product._id }).populate('warehouseId');
  const listings = await MarketplaceListing.find({ productId: product._id }).populate('marketplaceId');
  const stockTotals = await inventoryService.getTotalStock(product._id);

  return new ApiResponse(200, 'Product details fetched', {
    product,
    inventories,
    listings,
    stockTotals,
  }).send(res, 200);
});

const getProductBySku = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
  if (!product) throw new ApiError(404, 'Product not found');

  const stockTotals = await inventoryService.getTotalStock(product._id);
  return new ApiResponse(200, 'Product fetched by SKU', { product, stockTotals }).send(res, 200);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');

  return new ApiResponse(200, 'Product updated successfully', product).send(res, 200);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new ApiError(404, 'Product not found');

  return new ApiResponse(200, 'Product deactivated successfully').send(res, 200);
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductBySku,
  updateProduct,
  deleteProduct,
};
