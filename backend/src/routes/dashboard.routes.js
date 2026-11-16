const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

router.get('/overview', protect, dashboardController.getOverview);
router.get('/sales', protect, dashboardController.getSalesAnalytics);
router.get('/top-products', protect, dashboardController.getTopProducts);
router.get('/warehouse-distribution', protect, dashboardController.getWarehouseDistribution);

module.exports = router;
