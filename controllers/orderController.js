const Order = require('../models/Order');

// GET /api/orders (with optional date filtering)
exports.getAllOrders = async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};
    
    // If date is provided, filter orders for that date
    if (date) {
      query.pickupDate = date;
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .populate('items.menuItemId')
      .populate('items.originalId', 'name category price');
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.menuItemId')
      .populate('items.originalId', 'name category price description');
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    // Handle both old and new data structures
    const orderData = {
      customerName: req.body.customer?.name || req.body.customerName,
      customerEmail: req.body.customer?.email || req.body.customerEmail,
      customerPhone: req.body.customer?.phone || req.body.customerPhone,
      customer: req.body.customer || {
        name: req.body.customerName,
        email: req.body.customerEmail,
        phone: req.body.customerPhone
      },
      items: req.body.items.map(item => ({
        id: item.id,
        originalId: item.originalId || item.id,
        name: item.name,
        price: item.price,
        basePrice: item.basePrice || item.price,
        quantity: item.quantity,
        selectedFlavor: item.selectedFlavor || null,
        selectedAddons: item.selectedAddons || [],
        customizations: item.customizations || {}
      })),
      customerNotes: req.body.customerNotes || '',
      totalAmount: req.body.total || req.body.totalAmount,
      subtotal: req.body.subtotal,
      tax: req.body.tax,
      total: req.body.total,
      pickupDate: req.body.pickupDate,
      pickupTime: req.body.pickupTime,
      paymentMethod: req.body.paymentMethod,
      status: req.body.status || 'confirmed',
      orderDate: req.body.orderDate || new Date()
    };

    const newOrder = new Order(orderData);
    await newOrder.save();

    // Populate the saved order for response
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('items.originalId', 'name category price');

    res.status(201).json({
      success: true,
      data: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};

// PUT /api/orders/:id
exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Valid options: ' + validStatuses.join(', ')
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    updateData.updatedAt = new Date();
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.originalId', 'name category price');
    
    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// DELETE /api/orders/:id
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      message: 'Order deleted permanently',
      deletedOrder: {
        id: deletedOrder._id,
        customerName: deletedOrder.customerName,
        total: deletedOrder.totalAmount || deletedOrder.total
      }
    });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// GET ORDER SUMMARY (for meal prep planning)
exports.getOrderSummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    const orders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $nin: ['cancelled'] } // Exclude cancelled orders
    }).populate('items.originalId', 'name category');

    // Calculate summary data
    const itemSummary = {};
    let totalOrders = orders.length;
    let totalRevenue = 0;

    orders.forEach(order => {
      totalRevenue += order.totalAmount || order.total || 0;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemKey = `${item.name}${item.customizations?.flavor ? ` (${item.customizations.flavor})` : ''}`;
          
          if (!itemSummary[itemKey]) {
            itemSummary[itemKey] = {
              name: item.name,
              quantity: 0,
              flavor: item.customizations?.flavor || null,
              addons: new Set(),
              totalRevenue: 0,
              originalId: item.originalId
            };
          }
          
          itemSummary[itemKey].quantity += item.quantity || 1;
          itemSummary[itemKey].totalRevenue += (item.price || 0) * (item.quantity || 1);
          
          // Track popular addons
          if (item.customizations?.addons && Array.isArray(item.customizations.addons)) {
            item.customizations.addons.forEach(addon => {
              itemSummary[itemKey].addons.add(addon);
            });
          }
        });
      }
    });

    // Convert addon sets to arrays and sort items by quantity
    const sortedItems = Object.values(itemSummary)
      .map(item => ({
        ...item,
        addons: Array.from(item.addons)
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const summaryData = {
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: parseInt(days)
      },
      totalOrders,
      totalRevenue,
      items: sortedItems,
      ordersByStatus: {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        completed: orders.filter(o => o.status === 'completed').length
      }
    };

    res.json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    console.error('Error generating order summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate order summary' 
    });
  }
};