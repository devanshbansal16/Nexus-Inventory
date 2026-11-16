const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/status', protect, syncController.getSyncStatus);
router.get('/jobs', protect, syncController.getSyncJobs);
router.get('/jobs/:id', protect, syncController.getSyncJobById);

router.post(
  '/trigger',
  protect,
  authorize('super_admin', 'inventory_manager'),
  syncController.triggerSync
);

router.post(
  '/jobs/:id/retry',
  protect,
  authorize('super_admin', 'inventory_manager'),
  syncController.retrySyncJob
);

router.post(
  '/reconcile',
  protect,
  authorize('super_admin', 'inventory_manager'),
  syncController.reconcile
);

module.exports = router;
