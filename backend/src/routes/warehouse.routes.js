const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, warehouseController.getWarehouses);
router.get('/:id', protect, warehouseController.getWarehouseById);
router.get('/:id/inventory', protect, warehouseController.getWarehouseInventory);
router.get('/:id/capacity', protect, warehouseController.getWarehouseCapacity);

router.post(
  '/',
  protect,
  authorize('super_admin'),
  warehouseController.createWarehouse
);

router.put(
  '/:id',
  protect,
  authorize('super_admin', 'warehouse_manager'),
  warehouseController.updateWarehouse
);

module.exports = router;
