// BACKEND FILE: routes/paymentRoutes.js
// REPLACE YOUR ENTIRE paymentRoutes.js FILE WITH THIS

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session (for embedded checkout form)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, customerInfo, pickupDetails, totalAmount } = req.body;

    // Validate required data
    if (!cart || !customerInfo || !pickupDetails || !totalAmount) {
      return res.status(400).json({ error: 'Missing required order information' });
    }

    // Create line items from cart
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', // THIS IS KEY FOR EMBEDDED CHECKOUT
      mode: 'payment',
      line_items: lineItems,
      customer_email: customerInfo.email,
      metadata: {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        pickupDate: pickupDetails.date,
        pickupTime: pickupDetails.time,
        cartItems: JSON.stringify(cart),
        totalAmount: totalAmount.toString(),
      },
      return_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    });

    console.log('Stripe session created:', session.id);
    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve session status (for order confirmation page)
router.get('/session-status', async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;