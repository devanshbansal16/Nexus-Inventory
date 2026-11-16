const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post(
  '/',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  transferController.createTransfer
);

router.get('/', protect, transferController.getTransfers);
router.get('/:id', protect, transferController.getTransferById);

router.patch(
  '/:id/approve',
  protect,
  authorize('super_admin', 'inventory_manager'),
  transferController.approveTransfer
);

router.patch(
  '/:id/dispatch',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  transferController.dispatchTransfer
);

router.patch(
  '/:id/receive',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  transferController.receiveTransfer
);

module.exports = router;
