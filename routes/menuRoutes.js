const express = require('express');
const router = express.Router();
const {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability // 👈 added here
} = require('../controllers/menuController');

// Public CRUD for now
router.get('/', getAllMenuItems);
router.get('/:id', getMenuItemById);
router.post('/', createMenuItem);
router.put('/:id', updateMenuItem);
router.delete('/:id', deleteMenuItem);

// Toggle availability
router.patch('/:id/toggle', toggleMenuItemAvailability); // 👈 new route

module.exports = router;
