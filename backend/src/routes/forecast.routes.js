const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecast.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/recommendations', protect, forecastController.getRecommendations);
router.get('/warehouse/:id', protect, forecastController.getForecastByWarehouse);
router.get('/:productId', protect, forecastController.getForecastByProductId);

router.post(
  '/generate',
  protect,
  authorize('super_admin', 'inventory_manager'),
  forecastController.generateForecast
);

module.exports = router;
