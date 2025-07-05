const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

// Routes
router.get('/', orderController.getOrders);
router.post('/', orderController.createOrder);
router.put('/', orderController.updateOrderStatus);

module.exports = router;
