const express = require('express');
const router = express.Router();

// Import controller functions
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderSummary
} = require('../controllers/orderController');

// GET /api/orders - Get all orders (with optional date filtering)
router.get('/', getAllOrders);

// GET /api/orders/summary - Get order summary for date range
router.get('/summary', getOrderSummary);

// GET /api/orders/:id - Get specific order
router.get('/:id', getOrderById);

// POST /api/orders - Create new order
router.post('/', createOrder);

// PUT /api/orders/:id - Update entire order
router.put('/:id', updateOrder);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus);

// PATCH /api/orders/:id - Update order status (alternative endpoint)
router.patch('/:id', updateOrderStatus);

// DELETE /api/orders/:id - Delete order permanently
router.delete('/:id', deleteOrder);

module.exports = router;