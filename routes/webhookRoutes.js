const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { sendOrderConfirmation, sendAdminNotification } = require('../services/emailService');

// Webhook endpoint - MUST use raw body for signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('💳 Payment successful for session:', session.id);

      try {
        // Create order from session data
        const metadata = session.metadata;
        
        console.log('📦 Session metadata:', JSON.stringify(metadata, null, 2));
        
        // Reassemble cart data from chunks
        let cartData = '';
        const numChunks = parseInt(metadata.cartDataChunks || '0');
        
        console.log('📦 Number of cart data chunks:', numChunks);
        
        if (numChunks > 0) {
          for (let i = 0; i < numChunks; i++) {
            cartData += metadata[`cartData_${i}`] || '';
          }
        }
        
        console.log('📦 Reassembled cart data:', cartData);

        // Parse the full cart data
        let cartItems = [];
        try {
          cartItems = JSON.parse(cartData || '[]');
          console.log('✅ Parsed cart items:', cartItems);
        } catch (parseError) {
          console.error('❌ Error parsing cart data:', parseError);
          cartItems = [];
        }

        // Map cart items to order item format
        const orderItems = cartItems.map(item => ({
          id: item.id,
          originalId: item.originalId,
          name: item.name,
          price: item.price,
          basePrice: item.basePrice,
          quantity: item.quantity,
          selectedFlavor: item.selectedFlavor || undefined,
          selectedAddons: item.selectedAddons || [],
        }));

        console.log('📦 Order items:', orderItems);

        // Convert pickupDate string to Date object
        let pickupDate = null;
        if (metadata.pickupDate) {
          console.log('🗓️ Raw pickupDate from metadata:', metadata.pickupDate);
          
          // Try parsing the date
          pickupDate = new Date(metadata.pickupDate);
          
          // Validate the date
          if (isNaN(pickupDate.getTime())) {
            console.error('❌ Invalid pickupDate, using current date as fallback');
            pickupDate = new Date(); // Fallback to current date
          } else {
            console.log('✅ Parsed pickupDate:', pickupDate.toISOString());
          }
        } else {
          console.warn('⚠️ No pickupDate in metadata, using current date');
          pickupDate = new Date(); // Default to current date if not provided
        }

        const newOrder = new Order({
          customerName: session.customer_details?.name || metadata.customerName || 'Guest',
          customerEmail: session.customer_details?.email || metadata.customerEmail || '',
          customerPhone: metadata.customerPhone || '',
          items: orderItems,
          totalAmount: session.amount_total / 100, // Convert from cents to dollars
          status: 'new',
          paymentMethod: 'card',
          pickupDate: pickupDate,
          pickupTime: metadata.pickupTime || '',
          customerNotes: metadata.specialInstructions || '',
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          isAdminOrder: false,
        });

        console.log('💾 Attempting to save order...');
        await newOrder.save();
        console.log('✅ Order created successfully:', newOrder._id);

        // Send email confirmations
        try {
          console.log('📧 Sending email confirmations...');
          await sendOrderConfirmation(newOrder);
          await sendAdminNotification(newOrder);
          console.log('✅ Email confirmations sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending emails:', emailError.message);
          console.error('Email error stack:', emailError.stack);
          // Don't fail the webhook if emails fail
        }

      } catch (error) {
        console.error('❌ Error creating order:', error.message);
        console.error('Full error:', error);
        // Don't return error to Stripe - we don't want them to retry
      }
      break;

    case 'checkout.session.async_payment_succeeded':
      console.log('💰 Async payment succeeded');
      break;

    case 'checkout.session.async_payment_failed':
      console.log('❌ Async payment failed');
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

module.exports = router;