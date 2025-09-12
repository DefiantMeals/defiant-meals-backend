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
  setMenuItemAvailability,
  // Add these new functions for customization
  addFlavorOption,
  addAddonOption,
  removeFlavorOption,
  removeAddonOption
} = require('../controllers/menuController');

// EXISTING ROUTES (keep these as they are)
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

// NEW ROUTES FOR FLAVOR AND ADDON MANAGEMENT
// POST /api/menu/:id/flavors - Add flavor option to menu item
router.post('/:id/flavors', addFlavorOption);

// POST /api/menu/:id/addons - Add addon option to menu item
router.post('/:id/addons', addAddonOption);

// DELETE /api/menu/:id/flavors/:flavorId - Remove flavor option
router.delete('/:id/flavors/:flavorId', removeFlavorOption);

// DELETE /api/menu/:id/addons/:addonId - Remove addon option
router.delete('/:id/addons/:addonId', removeAddonOption);

module.exports = router;