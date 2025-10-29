const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a payment intent
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, customerEmail, customerName } = req.body;

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      receipt_email: customerEmail,
      metadata: {
        customerName: customerName
      },
      automatic_payment_methods: {
        enabled: true,
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Confirm payment (optional endpoint for verification)
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
};