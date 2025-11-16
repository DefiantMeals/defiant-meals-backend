const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const GrabAndGoOrder = require('../models/GrabAndGoOrder');
const Menu = require('../models/Menu');
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
        const metadata = session.metadata;
        console.log('📦 Session metadata:', JSON.stringify(metadata, null, 2));

        // Check if this is a Grab and Go order
        if (metadata.orderType === 'grab-and-go') {
          console.log('🛒 Processing Grab and Go order');
          
          // Parse Grab and Go items
          const items = JSON.parse(metadata.items || '[]');
          const totalAmount = parseFloat(metadata.totalAmount || '0');

          // Create Grab and Go order
          const grabAndGoOrder = new GrabAndGoOrder({
            items: items,
            totalAmount: totalAmount,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            status: 'paid'
          });

          await grabAndGoOrder.save();
          console.log('✅ Grab and Go order created:', grabAndGoOrder._id);

          // Reduce inventory for each item
          for (const item of items) {
            await Menu.findByIdAndUpdate(
              item.menuItemId,
              { $inc: { inventory: -item.quantity } }
            );
            console.log(`📦 Reduced inventory for ${item.name} by ${item.quantity}`);
          }

        } else {
          // Regular meal prep order
          console.log('🍱 Processing regular meal prep order');
          
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
            
            pickupDate = new Date(metadata.pickupDate);
            
            if (isNaN(pickupDate.getTime())) {
              console.error('❌ Invalid pickupDate, using current date as fallback');
              pickupDate = new Date();
            } else {
              console.log('✅ Parsed pickupDate:', pickupDate.toISOString());
            }
          } else {
            console.warn('⚠️ No pickupDate in metadata, using current date');
            pickupDate = new Date();
          }

          const newOrder = new Order({
            customerName: session.customer_details?.name || metadata.customerName || 'Guest',
            customerEmail: session.customer_details?.email || metadata.customerEmail || '',
            customerPhone: metadata.customerPhone || '',
            items: orderItems,
            totalAmount: session.amount_total / 100,
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
          }
        }

      } catch (error) {
        console.error('❌ Error processing order:', error.message);
        console.error('Full error:', error);
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