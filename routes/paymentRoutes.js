const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session (for embedded checkout form)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, customerInfo, pickupDetails, subtotal, taxAmount, totalAmount } = req.body;

    console.log('📦 Creating checkout session with:', {
      cartItems: cart?.length || 0,
      customerInfo: customerInfo,
      pickupDetails: pickupDetails,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount
    });

    // Validate required data
    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid order amount' });
    }

    // Create line items from cart (menu items only, no tax yet)
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

    // Add tax as a separate line item
    if (taxAmount && taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Kansas sales tax (3% food, 9.5% non-food)',
          },
          unit_amount: Math.round(taxAmount * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Store FULL cart data as JSON string
    const cartData = JSON.stringify(cart.map(item => ({
      id: item.id,
      originalId: item.originalId || item._id || item.id,
      name: item.name,
      price: item.price,
      basePrice: item.basePrice || item.price,
      quantity: item.quantity,
      selectedFlavor: item.selectedFlavor || null,
      selectedAddons: item.selectedAddons || [],
      isFood: item.isFood,
    })));

    console.log('📦 Full cart data length:', cartData.length);
    console.log('📦 Cart data:', cartData);

    // Split cart data into chunks if needed (Stripe limit is 500 chars per metadata field)
    const metadata = {
      customerName: customerInfo?.name || '',
      customerEmail: customerInfo?.email || '',
      customerPhone: customerInfo?.phone || '',
      pickupDate: pickupDetails?.date || '',
      pickupTime: pickupDetails?.time || '',
      subtotal: subtotal?.toString() || '0',
      taxAmount: taxAmount?.toString() || '0',
      totalAmount: totalAmount.toString(),
      specialInstructions: pickupDetails?.notes || '',
    };

    // Split cartData into multiple metadata fields if needed
    const chunkSize = 450; // Leave some margin below 500 char limit
    const chunks = [];
    for (let i = 0; i < cartData.length; i += chunkSize) {
      chunks.push(cartData.substring(i, i + chunkSize));
    }

    // Add cart data chunks to metadata
    chunks.forEach((chunk, index) => {
      metadata[`cartData_${index}`] = chunk;
    });
    metadata.cartDataChunks = chunks.length.toString();

    console.log('📦 Metadata chunks:', chunks.length);
    console.log('📦 Complete metadata:', metadata);

    // Create the checkout session
    const sessionConfig = {
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: lineItems,
      metadata: metadata,
      return_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    };

    // Only add customer_email if we have it
    if (customerInfo?.email && customerInfo.email.trim() !== '') {
      sessionConfig.customer_email = customerInfo.email.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Stripe session created:', session.id);
    console.log('✅ Total amount charged:', totalAmount);
    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('❌ Stripe session creation error:', error);
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