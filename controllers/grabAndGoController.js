const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Menu = require('../models/Menu');
const GrabAndGoItem = require('../models/GrabAndGoItem');
const GrabAndGoOrder = require('../models/GrabAndGoOrder');

// GET /api/grab-and-go/menu - Get all available Grab & Go items
exports.getGrabAndGoMenu = async (req, res) => {
  try {
    // Get menu items that are Grab & Go and have inventory > 0
    const items = await Menu.find({
      isGrabAndGo: true,
      inventory: { $gt: 0 }
    }).sort({ name: 1 });

    res.json(items);
  } catch (error) {
    console.error('Error fetching Grab & Go menu:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/grab-and-go/menu/all - Get all Grab & Go items (admin)
exports.getAllGrabAndGoItems = async (req, res) => {
  try {
    const items = await GrabAndGoItem.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching all Grab & Go items:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/grab-and-go/menu - Create a new Grab & Go item (admin)
exports.createGrabAndGoItem = async (req, res) => {
  try {
    const newItem = new GrabAndGoItem(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating Grab & Go item:', error);
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/grab-and-go/menu/:id - Update a Grab & Go item (admin)
exports.updateGrabAndGoItem = async (req, res) => {
  try {
    const updatedItem = await GrabAndGoItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating Grab & Go item:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/grab-and-go/menu/:id - Delete a Grab & Go item (admin)
exports.deleteGrabAndGoItem = async (req, res) => {
  try {
    const deletedItem = await GrabAndGoItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', deletedItem });
  } catch (error) {
    console.error('Error deleting Grab & Go item:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/grab-and-go/create-checkout-session - Create Stripe checkout session
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    if (!customerEmail) {
      return res.status(400).json({ message: 'Customer email is required' });
    }

    // Verify inventory and build line items
    const lineItems = [];
    const orderItems = [];

    for (const item of items) {
      // Verify the item exists and has sufficient inventory
      const dbItem = await Menu.findById(item.menuItemId);

      if (!dbItem) {
        return res.status(400).json({
          message: `Item not found: ${item.name}`
        });
      }

      if (dbItem.inventory < item.quantity) {
        return res.status(400).json({
          message: `Insufficient inventory for ${item.name}. Available: ${dbItem.inventory}`
        });
      }

      // Build Stripe line item (price is already with tax from frontend)
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      });

      // Build order item for metadata
      orderItems.push({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/grab-and-go/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/grab-and-go`,
      metadata: {
        orderType: 'grab-and-go',
        customerEmail: customerEmail,
        orderItems: JSON.stringify(orderItems),
        totalAmount: total.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/grab-and-go/orders - Get all Grab & Go orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await GrabAndGoOrder.find()
      .sort({ createdAt: -1 })
      .populate('items.menuItemId', 'name price');

    res.json(orders);
  } catch (error) {
    console.error('Error fetching Grab & Go orders:', error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/grab-and-go/orders/:id/status - Update order status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'paid', 'ready', 'picked_up', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Valid options: ' + validStatuses.join(', ')
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updatedOrder = await GrabAndGoOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Handle successful payment webhook (called from webhookRoutes)
exports.handleSuccessfulPayment = async (session) => {
  try {
    const metadata = session.metadata;

    if (metadata.orderType !== 'grab-and-go') {
      return null; // Not a Grab & Go order
    }

    const orderItems = JSON.parse(metadata.orderItems || '[]');

    // Create the order
    const newOrder = new GrabAndGoOrder({
      customerEmail: session.customer_details?.email || metadata.customerEmail,
      customerName: session.customer_details?.name || '',
      items: orderItems,
      totalAmount: session.amount_total / 100,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      status: 'paid'
    });

    await newOrder.save();

    // Decrement inventory for each item
    for (const item of orderItems) {
      await Menu.findByIdAndUpdate(
        item.menuItemId,
        { $inc: { inventory: -item.quantity } }
      );
    }

    console.log('Grab & Go order created:', newOrder._id);
    return newOrder;
  } catch (error) {
    console.error('Error handling Grab & Go payment:', error);
    throw error;
  }
};
