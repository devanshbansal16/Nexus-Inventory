const mongoose = require('mongoose');
const { SyncJob, MarketplaceListing, Marketplace } = require('../models');
const syncService = require('../services/sync.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { DEMO_SYNC_JOBS, DEMO_MARKETPLACES } = require('../utils/demoData');

const triggerSync = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (productId) {
    const results = await syncService.syncProductToAllMarketplaces(productId);
    return new ApiResponse(200, 'Product sync triggered', results).send(res, 200);
  }

  const results = await syncService.reconcileAllInventory();
  return new ApiResponse(200, 'Global sync triggered for all products', results).send(res, 200);
});

const getSyncJobs = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return new ApiResponse(200, 'Sync jobs fetched (Demo Mode)', {
      jobs: DEMO_SYNC_JOBS,
      pagination: {
        total: DEMO_SYNC_JOBS.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }).send(res, 200);
  }

  const { page = 1, limit = 20, status, marketplaceId } = req.query;

  const query = {};
  if (status) query.status = status.toUpperCase();
  if (marketplaceId) query.marketplaceId = marketplaceId;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await SyncJob.countDocuments(query);
  const jobs = await SyncJob.find(query)
    .populate('productId', 'name sku')
    .populate('marketplaceId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return new ApiResponse(200, 'Sync jobs fetched', {
    jobs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }).send(res, 200);
});

const getSyncJobById = asyncHandler(async (req, res) => {
  const job = await SyncJob.findById(req.params.id)
    .populate('productId')
    .populate('marketplaceId');
  if (!job) throw new ApiError(404, 'Sync job not found');

  return new ApiResponse(200, 'Sync job details', job).send(res, 200);
});

const retrySyncJob = asyncHandler(async (req, res) => {
  const job = await SyncJob.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Sync job not found');

  const results = await syncService.syncProductToAllMarketplaces(job.productId, null);
  job.retryCount += 1;
  job.status = 'COMPLETED';
  await job.save();

  return new ApiResponse(200, 'Sync job retried successfully', results).send(res, 200);
});

const getSyncStatus = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    const platforms = DEMO_MARKETPLACES.map((mp) => ({
      id: mp._id,
      name: mp.name,
      code: mp.code,
      connectionStatus: mp.status,
      totalListings: mp.totalListings,
      inSyncListings: mp.inSyncCount,
      failedListings: mp.failedCount,
      healthPercentage: 100,
      lastSyncAt: mp.lastSyncAt,
    }));

    return new ApiResponse(200, 'Overall synchronization status (Demo Mode)', {
      platforms,
      totalSyncJobsProcessed: DEMO_SYNC_JOBS.length,
      failedSyncJobs: 0,
      recentJobs: DEMO_SYNC_JOBS,
    }).send(res, 200);
  }

  const marketplaces = await Marketplace.find();
  const listings = await MarketplaceListing.find();
  const recentJobs = await SyncJob.find().sort({ createdAt: -1 }).limit(10);

  const statusByPlatform = marketplaces.map((mp) => {
    const mpListings = listings.filter(
      (l) => String(l.marketplaceId) === String(mp._id)
    );
    const inSync = mpListings.filter((l) => l.syncStatus === 'IN_SYNC').length;
    const failed = mpListings.filter((l) => l.syncStatus === 'FAILED').length;

    return {
      id: mp._id,
      name: mp.name,
      code: mp.code,
      connectionStatus: mp.status,
      totalListings: mpListings.length,
      inSyncListings: inSync,
      failedListings: failed,
      healthPercentage: mpListings.length > 0 ? Math.round((inSync / mpListings.length) * 100) : 100,
      lastSyncAt: mp.settings?.lastSyncAt || mp.updatedAt,
    };
  });

  return new ApiResponse(200, 'Overall synchronization status', {
    platforms: statusByPlatform,
    totalSyncJobsProcessed: await SyncJob.countDocuments(),
    failedSyncJobs: await SyncJob.countDocuments({ status: 'FAILED' }),
    recentJobs,
  }).send(res, 200);
});

const reconcile = asyncHandler(async (req, res) => {
  const results = await syncService.reconcileAllInventory();
  return new ApiResponse(200, 'Inventory reconciled with all marketplaces', results).send(res, 200);
});

module.exports = {
  triggerSync,
  getSyncJobs,
  getSyncJobById,
  retrySyncJob,
  getSyncStatus,
  reconcile,
};
