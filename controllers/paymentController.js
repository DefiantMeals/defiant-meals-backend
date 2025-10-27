// ============================================
// STRIPE PAYMENT CONTROLLER - COMMENTED OUT
// UNCOMMENT WHEN STRIPE SECRET KEY IS ADDED
// ============================================

// ============================================
// UNCOMMENT THESE WHEN READY
// ============================================
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================
// CREATE PAYMENT INTENT
// ============================================
// exports.createPaymentIntent = async (req, res) => {
//   try {
//     const { amount, customerEmail, customerName } = req.body;
//
//     // Validate amount
//     if (!amount || amount < 50) { // Minimum $0.50
//       return res.status(400).json({ 
//         error: 'Invalid amount. Minimum charge is $0.50' 
//       });
//     }
//
//     // Create payment intent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amount, // Amount in cents
//       currency: 'usd',
//       receipt_email: customerEmail,
//       description: `Defiant Meals Order - ${customerName}`,
//       metadata: {
//         customer_name: customerName,
//         customer_email: customerEmail
//       },
//       automatic_payment_methods: {
//         enabled: true,
//       },
//     });
//
//     console.log('Payment intent created:', paymentIntent.id);
//
//     res.json({
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id
//     });
//   } catch (error) {
//     console.error('Error creating payment intent:', error);
//     res.status(500).json({ 
//       error: error.message || 'Failed to create payment intent' 
//     });
//   }
// };

// ============================================
// CONFIRM PAYMENT
// ============================================
// exports.confirmPayment = async (req, res) => {
//   try {
//     const { paymentIntentId } = req.body;
//
//     if (!paymentIntentId) {
//       return res.status(400).json({ 
//         error: 'Payment intent ID is required' 
//       });
//     }
//
//     // Retrieve payment intent to verify it succeeded
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
//
//     if (paymentIntent.status === 'succeeded') {
//       console.log('Payment confirmed:', paymentIntentId);
//       res.json({
//         success: true,
//         paymentIntent: {
//           id: paymentIntent.id,
//           amount: paymentIntent.amount,
//           status: paymentIntent.status
//         }
//       });
//     } else {
//       res.status(400).json({
//         error: 'Payment not completed',
//         status: paymentIntent.status
//       });
//     }
//   } catch (error) {
//     console.error('Error confirming payment:', error);
//     res.status(500).json({ 
//       error: error.message || 'Failed to confirm payment' 
//     });
//   }
// };

// ============================================
// TEMPORARY PLACEHOLDER - DELETE WHEN ACTIVATING STRIPE
// ============================================
exports.createPaymentIntent = async (req, res) => {
  res.status(503).json({ 
    error: 'Stripe payment processing is not yet configured. Please use Pay on Pickup option.' 
  });
};

exports.confirmPayment = async (req, res) => {
  res.status(503).json({ 
    error: 'Stripe payment processing is not yet configured.' 
  });
};

// ============================================
// TO ACTIVATE STRIPE:
// 1. Install Stripe SDK: npm install stripe --break-system-packages
// 2. Add STRIPE_SECRET_KEY to Render environment variables
// 3. Uncomment all sections marked above
// 4. Delete the TEMPORARY PLACEHOLDER section
// 5. Deploy to Render
// ============================================

module.exports = {
  createPaymentIntent,
  confirmPayment
};