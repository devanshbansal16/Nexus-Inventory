const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplace.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, marketplaceController.getMarketplaces);
router.get('/:id', protect, marketplaceController.getMarketplaceById);
router.get('/:id/listings', protect, marketplaceController.getMarketplaceListings);

router.post(
  '/',
  protect,
  authorize('super_admin', 'inventory_manager'),
  marketplaceController.createMarketplace
);

router.patch(
  '/:id/status',
  protect,
  authorize('super_admin', 'inventory_manager'),
  marketplaceController.updateMarketplaceStatus
);

router.post(
  '/:id/connect',
  protect,
  authorize('super_admin', 'inventory_manager'),
  marketplaceController.connectMarketplace
);

router.post(
  '/:id/sync',
  protect,
  authorize('super_admin', 'inventory_manager'),
  marketplaceController.syncMarketplace
);

router.post(
  '/:id/simulate-failure',
  protect,
  authorize('super_admin'),
  marketplaceController.toggleSimulatedFailure
);

module.exports = router;
