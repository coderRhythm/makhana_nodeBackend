const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/database');

class PaymentController {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  // Create payment order
  async createPayment(req, res) {
    try {
      const { amount, currency = 'INR' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Razorpay credentials not configured'
        });
      }

      const options = {
        amount: amount, // amount in smallest currency unit
        currency: currency,
        receipt: 'order_' + Date.now(),
        payment_capture: 1
      };

      const order = await this.razorpay.orders.create(options);

      res.json({
        success: true,
        order: order,
        key_id: process.env.RAZORPAY_KEY_ID
      });

    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify payment
  async verifyPayment(req, res) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing payment verification data'
        });
      }

      // Generate signature for verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment signature verification failed'
        });
      }

      // Save payment details to database
      await pool.query(
        `INSERT INTO payments (order_id, payment_id, signature, amount, status, created_at)
         VALUES ($1, $2, $3, $4, 'success', CURRENT_TIMESTAMP)`,
        [razorpay_order_id, razorpay_payment_id, razorpay_signature, 0]
      );

      res.json({
        success: true,
        message: 'Payment verified successfully'
      });

    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PaymentController();
