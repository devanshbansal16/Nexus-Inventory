const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, productController.getProducts);
router.get('/sku/:sku', protect, productController.getProductBySku);
router.get('/:id', protect, productController.getProductById);

router.post(
  '/',
  protect,
  authorize('super_admin', 'inventory_manager'),
  productController.createProduct
);

router.put(
  '/:id',
  protect,
  authorize('super_admin', 'inventory_manager'),
  productController.updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('super_admin'),
  productController.deleteProduct
);

module.exports = router;
