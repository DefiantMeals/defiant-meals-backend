
const MenuItem = require('../models/menuModel');

// GET /menu
const handleGetMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ category: 1, name: 1 });
    res.status(200).json(menuItems);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
};

// GET /menu/:id
const handleGetMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    
    res.status(200).json(menuItem);
  } catch (err) {
    console.error('Error fetching menu item:', err);
    res.status(500).json({ error: 'Failed to fetch menu item.' });
  }
};

// POST /menu
const handleCreateMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, available } = req.body;
    
    // Basic validation
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }
    
    const newMenuItem = new MenuItem({
      name,
      description,
      price: parseFloat(price),
      category,
      available: available !== undefined ? available : true
    });
    
    const savedMenuItem = await newMenuItem.save();
    res.status(201).json(savedMenuItem);
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
};

// PUT /menu/:id
const handleUpdateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, available } = req.body;
    
    // Basic validation
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }
    
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price: parseFloat(price),
        category,
        available
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedMenuItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    
    res.status(200).json(updatedMenuItem);
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

// DELETE /menu/:id
const handleDeleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMenuItem = await MenuItem.findByIdAndDelete(id);
    
    if (!deletedMenuItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    
    res.status(200).json({ message: 'Menu item deleted successfully.', item: deletedMenuItem });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};

// PATCH /menu/:id/toggle
const handleToggleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the current item to toggle its availability
    const currentItem = await MenuItem.findById(id);
    if (!currentItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    
    const toggledMenuItem = await MenuItem.findByIdAndUpdate(
      id,
      { available: !currentItem.available },
      { new: true }
    );
    
    res.status(200).json(toggledMenuItem);
  } catch (err) {
    console.error('Error toggling menu item:', err);
    res.status(500).json({ error: 'Failed to toggle menu item availability.' });
  }
};

module.exports = {
  handleGetMenuItems,
  handleGetMenuItemById,
  handleCreateMenuItem,
  handleUpdateMenuItem,
  handleDeleteMenuItem,
  handleToggleMenuItem,
};