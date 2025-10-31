const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session (for embedded checkout form)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, customerInfo, pickupDetails, totalAmount } = req.body;

    // Validate required data
    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid order amount' });
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

    // Store FULL cart data as JSON string in metadata
    const cartData = JSON.stringify(cart.map(item => ({
      id: item.id,
      originalId: item.originalId || item._id || item.id,
      name: item.name,
      price: item.price,
      basePrice: item.basePrice || item.price,
      quantity: item.quantity,
      selectedFlavor: item.selectedFlavor || null,
      selectedAddons: item.selectedAddons || [],
    })));

    // Create the checkout session
    const sessionConfig = {
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        customerName: customerInfo?.name || '',
        customerEmail: customerInfo?.email || '',
        customerPhone: customerInfo?.phone || '',
        pickupDate: pickupDetails?.date || '',
        pickupTime: pickupDetails?.time || '',
        cartData: cartData.substring(0, 490), // Stripe limit is 500 chars per metadata value
        totalAmount: totalAmount.toString(),
        specialInstructions: pickupDetails?.notes || '',
      },
      return_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    };

    // Only add customer_email if we have it
    if (customerInfo?.email && customerInfo.email.trim() !== '') {
      sessionConfig.customer_email = customerInfo.email.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

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