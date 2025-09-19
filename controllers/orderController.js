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

// GET ORDER SUMMARY - SIMPLIFIED WORKING VERSION
exports.getOrderSummary = async (req, res) => {
  try {
    const { days, startDate, endDate, type } = req.query;
    let dateFilter = {};
    
    // Handle old format (days parameter)
    if (days && !startDate && !endDate) {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - parseInt(days));
      
      dateFilter.createdAt = {
        $gte: pastDate,
        $lte: today
      };
      
      // Get orders
      const orders = await Order.find(dateFilter);
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
      
      // Old format response
      return res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          items: [],
          dateRange: {
            start: pastDate.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
          }
        }
      });
    }
    
    // Handle new format (calendar interface)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Always use createdAt for simplicity - both order and pickup filtering
      dateFilter.createdAt = {
        $gte: start,
        $lte: end
      };
      
      // Get orders
      const orders = await Order.find(dateFilter);
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // New format response
      return res.json({
        totalOrders,
        totalRevenue,
        averageOrderValue
      });
    }
    
    // Missing parameters
    res.status(400).json({ 
      success: false,
      error: 'Missing required parameters: provide either days OR startDate+endDate' 
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate summary' 
    });
  }
};