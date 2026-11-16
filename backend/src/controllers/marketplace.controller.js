const { Marketplace, MarketplaceListing, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const syncService = require('../services/sync.service');
const { getAdapter } = require('../adapters/marketplace');

const getMarketplaces = asyncHandler(async (req, res) => {
  const marketplaces = await Marketplace.find();

  // Attach live simulated stock metrics for each marketplace
  const enriched = await Promise.all(
    marketplaces.map(async (mp) => {
      const listings = await MarketplaceListing.find({ marketplaceId: mp._id });
      return {
        ...mp.toObject(),
        totalListings: listings.length,
        inSyncCount: listings.filter((l) => l.syncStatus === 'IN_SYNC').length,
        failedCount: listings.filter((l) => l.syncStatus === 'FAILED').length,
      };
    })
  );

  return new ApiResponse(200, 'Marketplaces fetched', enriched).send(res, 200);
});

const getMarketplaceById = asyncHandler(async (req, res) => {
  const marketplace = await Marketplace.findById(req.params.id);
  if (!marketplace) throw new ApiError(404, 'Marketplace not found');

  const listings = await MarketplaceListing.find({ marketplaceId: marketplace._id }).populate(
    'productId'
  );

  return new ApiResponse(200, 'Marketplace details', { marketplace, listings }).send(res, 200);
});

const createMarketplace = asyncHandler(async (req, res) => {
  const { name, code, isSimulated, apiKey, apiSecret, settings } = req.body;

  const existing = await Marketplace.findOne({ code: code.toLowerCase() });
  if (existing) throw new ApiError(400, `Marketplace ${code} already registered`);

  const marketplace = new Marketplace({
    name,
    code: code.toLowerCase(),
    isSimulated: isSimulated ?? true,
    apiKey,
    apiSecret,
    settings,
  });

  await marketplace.save();

  return new ApiResponse(201, 'Marketplace registered', marketplace).send(res, 201);
});

const updateMarketplaceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const marketplace = await Marketplace.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!marketplace) throw new ApiError(404, 'Marketplace not found');

  return new ApiResponse(200, 'Marketplace status updated', marketplace).send(res, 200);
});

const connectMarketplace = asyncHandler(async (req, res) => {
  const marketplace = await Marketplace.findByIdAndUpdate(
    req.params.id,
    { status: 'CONNECTED', 'settings.lastSyncAt': new Date() },
    { new: true }
  );
  if (!marketplace) throw new ApiError(404, 'Marketplace not found');

  return new ApiResponse(200, 'Marketplace connected successfully', marketplace).send(res, 200);
});

const syncMarketplace = asyncHandler(async (req, res) => {
  const marketplace = await Marketplace.findById(req.params.id);
  if (!marketplace) throw new ApiError(404, 'Marketplace not found');

  const products = await Product.find({ isActive: true });
  const results = [];

  for (const prod of products) {
    const resList = await syncService.syncProductToAllMarketplaces(prod._id);
    results.push({ sku: prod.sku, resList });
  }

  marketplace.settings.lastSyncAt = new Date();
  await marketplace.save();

  return new ApiResponse(200, `Synchronized all products to ${marketplace.name}`, results).send(
    res,
    200
  );
});

const getMarketplaceListings = asyncHandler(async (req, res) => {
  const listings = await MarketplaceListing.find({ marketplaceId: req.params.id }).populate(
    'productId'
  );
  return new ApiResponse(200, 'Marketplace listings', listings).send(res, 200);
});

// Chaos test endpoint: toggle simulated failure on marketplace adapter
const toggleSimulatedFailure = asyncHandler(async (req, res) => {
  const marketplace = await Marketplace.findById(req.params.id);
  if (!marketplace) throw new ApiError(404, 'Marketplace not found');

  const { failNext } = req.body;
  const adapter = getAdapter(marketplace.code);
  adapter.setSimulatedFailure(Boolean(failNext));

  return new ApiResponse(
    200,
    `Simulated failure for ${marketplace.name} set to ${Boolean(failNext)}`
  ).send(res, 200);
});

module.exports = {
  getMarketplaces,
  getMarketplaceById,
  createMarketplace,
  updateMarketplaceStatus,
  connectMarketplace,
  syncMarketplace,
  getMarketplaceListings,
  toggleSimulatedFailure,
};
