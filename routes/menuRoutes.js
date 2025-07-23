const express = require('express');
const router = express.Router();
const {
  handleGetMenuItems,
  handleGetMenuItemById,
  handleCreateMenuItem,
  handleUpdateMenuItem,
  handleDeleteMenuItem,
  handleToggleMenuItem,
} = require('../controllers/menuController');

// GET all menu items
router.get('/', handleGetMenuItems);

// GET menu item by ID
router.get('/:id', handleGetMenuItemById);

// POST new menu item
router.post('/', handleCreateMenuItem);

// PUT update menu item
router.put('/:id', handleUpdateMenuItem);

// DELETE menu item
router.delete('/:id', handleDeleteMenuItem);

// PATCH toggle menu item availability
router.patch('/:id/toggle', handleToggleMenuItem);

module.exports = router;
