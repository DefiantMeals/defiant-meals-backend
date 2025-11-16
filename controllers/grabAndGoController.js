const GrabAndGoOrder = require('../models/GrabAndGoOrder');
const Menu = require('../models/Menu');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get all Grab and Go menu items (available items with inventory > 0)
exports.getGrabAndGoMenu = async (req, res) => {
  try {
    const items = await Menu.find({
      isGrabAndGo: true,
      available: true,
      inventory: { $gt: 0 }
    }).sort({ category: 1, name: 1 });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching Grab and Go menu:', error);
    res.status(500).json({ message: 'Error fetching menu items' });
  }
};

// Create Stripe checkout session for Grab and Go
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items } = req.body;

    // Validate items and check inventory
    const lineItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = await Menu.findById(item.menuItemId);
      
      if (!menuItem) {
        return res.status(404).json({ 
          message: `Menu item not found: ${item.name}` 
        });
      }
      
      if (!menuItem.isGrabAndGo) {
        return res.status(400).json({ 
          message: `${menuItem.name} is not available for Grab and Go` 
        });
      }
      
      if (menuItem.inventory < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory for ${menuItem.name}. Available: ${menuItem.inventory}` 
        });
      }

      // Add to line items for Stripe
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: menuItem.name,
            description: menuItem.description || 'Grab and Go item'
          },
          unit_amount: Math.round(menuItem.price * 100) // Convert to cents
        },
        quantity: item.quantity
      });

      totalAmount += menuItem.price * item.quantity;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/grab-and-go/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/grab-and-go`,
      metadata: {
        orderType: 'grab-and-go',
        items: JSON.stringify(items),
        totalAmount: totalAmount.toString()
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error.message 
    });
  }
};

// Create Grab and Go order (called by Stripe webhook after payment)
exports.createGrabAndGoOrder = async (req, res) => {
  try {
    const { items, totalAmount, stripeSessionId, stripePaymentIntentId } = req.body;

    // Validate inventory before creating order
    for (const item of items) {
      const menuItem = await Menu.findById(item.menuItemId);
      
      if (!menuItem) {
        return res.status(404).json({ 
          message: `Menu item ${item.name} not found` 
        });
      }
      
      if (!menuItem.isGrabAndGo) {
        return res.status(400).json({ 
          message: `${item.name} is not available for Grab and Go` 
        });
      }
      
      if (menuItem.inventory < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory for ${item.name}. Available: ${menuItem.inventory}` 
        });
      }
    }

    // Create the order
    const order = new GrabAndGoOrder({
      items,
      totalAmount,
      stripeSessionId,
      stripePaymentIntentId,
      status: 'paid'
    });

    await order.save();

    // Reduce inventory for each item
    for (const item of items) {
      await Menu.findByIdAndUpdate(
        item.menuItemId,
        { $inc: { inventory: -item.quantity } }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating Grab and Go order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

// Get all Grab and Go orders (for admin)
exports.getAllGrabAndGoOrders = async (req, res) => {
  try {
    const orders = await GrabAndGoOrder.find()
      .populate('items.menuItemId')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching Grab and Go orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Update Grab and Go order status
exports.updateGrabAndGoOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await GrabAndGoOrder.findByIdAndUpdate(
      id,
      { 
        status,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true }
    ).populate('items.menuItemId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order' });
  }
};