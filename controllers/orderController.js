const { getAllOrders, createOrder } = require('../models/orderModel');

// GET /orders
const handleGetOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// POST /orders
const handleCreateOrder = async (req, res) => {
  try {
    const newOrder = await createOrder(req.body);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order.' });
  }
};

module.exports = {
  handleGetOrders,
  handleCreateOrder,
};
