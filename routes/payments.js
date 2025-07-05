const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Routes
router.post('/create', paymentController.createPayment);
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
