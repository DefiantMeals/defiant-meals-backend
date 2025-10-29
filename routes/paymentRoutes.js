javascriptconst express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment
} = require('../controllers/paymentController');

// POST /api/payments/create-intent - Create a Stripe payment intent
router.post('/create-intent', createPaymentIntent);

// POST /api/payments/confirm - Confirm payment was successful
router.post('/confirm', confirmPayment);

module.exports = router;