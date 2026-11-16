const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', protect, orderController.createOrder);
router.get('/', protect, orderController.getOrders);
router.get('/marketplace/:marketplaceId', protect, orderController.getOrdersByMarketplace);
router.get('/:id', protect, orderController.getOrderById);

router.patch(
  '/:id/status',
  protect,
  authorize('super_admin', 'sales_manager', 'inventory_manager'),
  orderController.updateOrderStatus
);

router.post('/:id/cancel', protect, orderController.cancelOrder);
router.post(
  '/:id/return',
  protect,
  authorize('super_admin', 'inventory_manager', 'warehouse_manager'),
  orderController.returnOrder
);

module.exports = router;
