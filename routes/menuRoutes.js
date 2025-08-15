const express = require('express');
const router = express.Router();

// Import all controller functions
const {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  setMenuItemAvailability
} = require('../controllers/menuController');

// GET /api/menu - Get all menu items
router.get('/', getAllMenuItems);

// GET /api/menu/:id - Get specific menu item
router.get('/:id', getMenuItemById);

// POST /api/menu - Create new menu item
router.post('/', createMenuItem);

// PUT /api/menu/:id - Update entire menu item
router.put('/:id', updateMenuItem);

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', deleteMenuItem);

// PATCH /api/menu/:id/toggle - Toggle availability status
router.patch('/:id/toggle', toggleMenuItemAvailability);

// PATCH /api/menu/:id/availability - Set specific availability status
router.patch('/:id/availability', setMenuItemAvailability);

module.exports = router;