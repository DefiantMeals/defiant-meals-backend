const express = require('express');
const router = express.Router();
const {
  handleGetOrders,
  handleCreateOrder,
} = require('../controllers/orderController');

// GET all orders
router.get('/', handleGetOrders);

// POST new order
router.post('/', handleCreateOrder);

module.exports = router;
