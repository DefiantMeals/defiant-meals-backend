const express = require('express');
const router = express.Router();

const {
  getGrabAndGoMenu,
  getAllGrabAndGoItems,
  createGrabAndGoItem,
  updateGrabAndGoItem,
  deleteGrabAndGoItem,
  createCheckoutSession,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/grabAndGoController');

// Public routes
// GET /api/grab-and-go/menu - Get available menu items (inventory > 0)
router.get('/menu', getGrabAndGoMenu);

// POST /api/grab-and-go/create-checkout-session - Create Stripe checkout
router.post('/create-checkout-session', createCheckoutSession);

// Admin routes for menu management
// GET /api/grab-and-go/menu/all - Get all items including out of stock
router.get('/menu/all', getAllGrabAndGoItems);

// POST /api/grab-and-go/menu - Create new item
router.post('/menu', createGrabAndGoItem);

// PUT /api/grab-and-go/menu/:id - Update item
router.put('/menu/:id', updateGrabAndGoItem);

// DELETE /api/grab-and-go/menu/:id - Delete item
router.delete('/menu/:id', deleteGrabAndGoItem);

// Admin routes for order management
// GET /api/grab-and-go/orders - Get all orders
router.get('/orders', getAllOrders);

// PUT /api/grab-and-go/orders/:id/status - Update order status
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
