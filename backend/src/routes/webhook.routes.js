const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// External marketplace order webhooks (simulated or production endpoints)
router.post('/amazon/orders', webhookController.amazonOrders);
router.post('/flipkart/orders', webhookController.flipkartOrders);
router.post('/meesho/orders', webhookController.meeshoOrders);
router.post('/shopify/orders', webhookController.shopifyOrders);
router.post('/:platform/cancellations', webhookController.platformCancellations);

module.exports = router;
