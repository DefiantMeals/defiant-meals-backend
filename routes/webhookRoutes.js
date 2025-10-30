const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { sendOrderConfirmation, sendAdminNotification } = require('../utils/emailService');

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
        
        // Parse cart summary back into items
        const cartItems = metadata.cartSummary ? 
          metadata.cartSummary.split(', ').map(item => {
            const match = item.match(/(.+) x(\d+)/);
            return match ? { name: match[1], quantity: parseInt(match[2]) } : null;
          }).filter(Boolean) : [];

        const newOrder = new Order({
          customerName: session.customer_details?.name || metadata.customerName || 'Guest',
          customerEmail: session.customer_details?.email || metadata.customerEmail || '',
          customerPhone: metadata.customerPhone || '',
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: 0 // We don't have individual prices in metadata
          })),
          totalAmount: session.amount_total / 100, // Convert from cents to dollars
          status: 'new',
          paymentStatus: 'paid',
          paymentMethod: 'card',
          pickupDate: metadata.pickupDate || '',
          pickupTime: metadata.pickupTime || '',
          specialInstructions: metadata.specialInstructions || '',
          customerNotes: metadata.specialInstructions || '',
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent
        });

        await newOrder.save();
        console.log('✅ Order created:', newOrder.orderId);

        // Send email confirmations
        try {
          await sendOrderConfirmation(newOrder);
          await sendAdminNotification(newOrder);
          console.log('📧 Email confirmations sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending emails:', emailError);
          // Don't fail the webhook if emails fail
        }

      } catch (error) {
        console.error('❌ Error creating order:', error);
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