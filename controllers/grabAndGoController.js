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

// Create Stripe checkout session for Grab and Go (MATCHES PRE-ORDER FORMAT)
exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerInfo } = req.body;

    console.log('🛒 Creating Grab & Go checkout session with:', {
      items: items?.length || 0,
      customerInfo: customerInfo
    });

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lineItems = [];
    let totalAmount = 0;
    const validatedItems = [];

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
            description: menuItem.description || 'Grab and Go item',
            images: menuItem.imageUrl ? [menuItem.imageUrl] : []
          },
          unit_amount: Math.round(menuItem.price * 100)
        },
        quantity: item.quantity
      });

      totalAmount += menuItem.price * item.quantity;

      // Store validated item data
      validatedItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity
      });
    }

    // Create cart data string (matching pre-order format)
    const cartData = JSON.stringify(validatedItems);
    
    console.log('🛒 Cart data:', cartData);

    // Create metadata (matching pre-order format with chunks)
    const metadata = {
      orderType: 'grab-and-go',
      customerName: customerInfo?.name || 'Guest',
      customerEmail: customerInfo?.email || '',
      customerPhone: customerInfo?.phone || '',
      totalAmount: totalAmount.toString(),
    };

    // Split cartData into chunks (matching pre-order format)
    const chunkSize = 450;
    const chunks = [];
    for (let i = 0; i < cartData.length; i += chunkSize) {
      chunks.push(cartData.substring(i, i + chunkSize));
    }

    chunks.forEach((chunk, index) => {
      metadata[`cartData_${index}`] = chunk;
    });
    metadata.cartDataChunks = chunks.length.toString();

    console.log('📦 Metadata chunks:', chunks.length);

    // Create session config (MATCHES PRE-ORDER FORMAT EXACTLY)
    const sessionConfig = {
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: lineItems,
      metadata: metadata,
      return_url: `${process.env.FRONTEND_URL || 'https://defiantmeals.com'}/grab-and-go/success?session_id={CHECKOUT_SESSION_ID}`,
    };

    // Only add customer_email if we have it
    if (customerInfo?.email && customerInfo.email.trim() !== '') {
      sessionConfig.customer_email = customerInfo.email.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Grab & Go Stripe session created:', session.id);
    
    // Return clientSecret (matching pre-order format)
    res.json({ clientSecret: session.client_secret });

  } catch (error) {
    console.error('❌ Grab & Go session creation error:', error);
    res.status(500).json({ error: error.message });
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