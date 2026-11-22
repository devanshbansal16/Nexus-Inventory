const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const productRoutes = require('./product.routes');
const warehouseRoutes = require('./warehouse.routes');
const inventoryRoutes = require('./inventory.routes');
const orderRoutes = require('./order.routes');
const marketplaceRoutes = require('./marketplace.routes');
const webhookRoutes = require('./webhook.routes');
const syncRoutes = require('./sync.routes');
const transferRoutes = require('./transfer.routes');
const dashboardRoutes = require('./dashboard.routes');
const forecastRoutes = require('./forecast.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/marketplaces', marketplaceRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/sync', syncRoutes);
router.use('/transfers', transferRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/forecast', forecastRoutes);
router.get('/users', protect, authController.getAllUsers);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CIMS API is operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
