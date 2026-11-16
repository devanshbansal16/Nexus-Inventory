const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, inventoryController.getInventory);
router.get('/transactions', protect, inventoryController.getTransactions);
router.get('/low-stock', protect, inventoryController.getLowStock);
router.get('/warehouse/:warehouseId', protect, inventoryController.getInventoryByWarehouseId);
router.get('/:productId', protect, inventoryController.getInventoryByProductId);

router.patch(
  '/adjust',
  protect,
  authorize('super_admin', 'inventory_manager'),
  inventoryController.adjustStock
);

router.post(
  '/stock-in',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  inventoryController.stockIn
);

router.post(
  '/stock-out',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  inventoryController.stockOut
);

module.exports = router;
