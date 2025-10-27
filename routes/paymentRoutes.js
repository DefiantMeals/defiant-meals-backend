// ============================================
// STRIPE PAYMENT ROUTES - COMMENTED OUT
// UNCOMMENT WHEN STRIPE SECRET KEY IS ADDED
// ============================================

const express = require('express');
const router = express.Router();

// ============================================
// UNCOMMENT THESE IMPORTS WHEN READY
// ============================================
// const {
//   createPaymentIntent,
//   confirmPayment
// } = require('../controllers/paymentController');

// ============================================
// UNCOMMENT THESE ROUTES WHEN READY
// ============================================

// POST /api/payments/create-intent - Create a Stripe payment intent
// router.post('/create-intent', createPaymentIntent);

// POST /api/payments/confirm - Confirm payment was successful
// router.post('/confirm', confirmPayment);

module.exports = router;

// ============================================
// TO ACTIVATE:
// 1. Uncomment all sections above
// 2. Add to server.js:
//    const paymentRoutes = require('./routes/paymentRoutes');
//    app.use('/api/payments', paymentRoutes);
// 3. Add STRIPE_SECRET_KEY to .env on Render
// ============================================