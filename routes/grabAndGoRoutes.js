const express = require('express');
const router = express.Router();
const grabAndGoController = require('../controllers/grabAndGoController');

// Public routes
router.get('/menu', grabAndGoController.getGrabAndGoMenu);
router.post('/create-checkout-session', grabAndGoController.createCheckoutSession);

// Admin routes (you can add auth middleware later if needed)
router.get('/orders', grabAndGoController.getAllGrabAndGoOrders);
router.post('/orders', grabAndGoController.createGrabAndGoOrder);
router.patch('/orders/:id/status', grabAndGoController.updateGrabAndGoOrderStatus);

module.exports = router;