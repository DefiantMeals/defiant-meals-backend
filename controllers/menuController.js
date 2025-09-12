const Menu = require('../models/Menu');

// GET /api/menu
exports.getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await Menu.find().sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ message: 'Failed to fetch menu items', error: err.message });
  }
};

// GET /api/menu/:id
exports.getMenuItemById = async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching menu item:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid menu item ID format' });
    }
    res.status(500).json({ message: 'Failed to fetch menu item', error: err.message });
  }
};

// POST /api/menu
exports.createMenuItem = async (req, res) => {
  try {
    // Validate required fields
    const { name, price, category } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, price, and category are required' 
      });
    }

    // Create new menu item with default values
    const menuItemData = {
      ...req.body,
      available: req.body.available !== undefined ? req.body.available : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newItem = new Menu(menuItemData);
    await newItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      item: newItem
    });
  } catch (err) {
    console.error('Error creating menu item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Failed to create menu item', error: err.message });
  }
};

// PUT /api/menu/:id
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists first
    const existingItem = await Menu.findById(id);
    if (!existingItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Update the item with new data
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const updatedItem = await Menu.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Menu item updated successfully',
      item: updatedItem
    });
  } catch (err) {
    console.error('Error updating menu item:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid menu item ID format' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Failed to update menu item', error: err.message });
  }
};

// DELETE /api/menu/:id
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedItem = await Menu.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json({
      success: true,
      message: 'Menu item deleted successfully',
      deletedItem: {
        id: deletedItem._id,
        name: deletedItem.name
      }
    });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid menu item ID format' });
    }
    res.status(500).json({ message: 'Failed to delete menu item', error: err.message });
  }
};

// PATCH /api/menu/:id/toggle - FIXED VERSION
exports.toggleMenuItemAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the menu item
    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Toggle the availability
    const previousStatus = menuItem.available;
    menuItem.available = !menuItem.available;
    menuItem.updatedAt = new Date();
    
    // Save the updated item
    await menuItem.save();

    console.log(`Menu item "${menuItem.name}" availability toggled from ${previousStatus} to ${menuItem.available}`);

    // FIXED: Return the menu item directly (not wrapped in object)
    res.json(menuItem);
  } catch (err) {
    console.error('Error toggling menu item availability:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid menu item ID format' });
    }
    res.status(500).json({ 
      message: 'Server error while toggling availability', 
      error: err.message 
    });
  }
};

// PATCH /api/menu/:id/availability
exports.setMenuItemAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    
    if (typeof available !== 'boolean') {
      return res.status(400).json({ 
        message: 'Invalid availability value. Must be true or false.' 
      });
    }

    const updatedItem = await Menu.findByIdAndUpdate(
      id,
      { 
        available,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({
      success: true,
      message: `Menu item availability set to ${available ? 'available' : 'unavailable'}`,
      item: updatedItem
    });
  } catch (err) {
    console.error('Error setting menu item availability:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid menu item ID format' });
    }
    res.status(500).json({ 
      message: 'Server error while setting availability', 
      error: err.message 
    });
  }
};

// NEW FUNCTIONS FOR FLAVOR AND ADDON MANAGEMENT

// ADD FLAVOR OPTION TO MENU ITEM
exports.addFlavorOption = async (req, res) => {
  try {
    const { id } = req.params;
    const flavorData = req.body;

    // Validate required fields
    if (!flavorData.name) {
      return res.status(400).json({
        success: false,
        error: 'Flavor name is required'
      });
    }

    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Menu item not found' 
      });
    }

    // Check if flavor already exists
    const existingFlavor = menuItem.flavorOptions.find(
      flavor => flavor.name.toLowerCase() === flavorData.name.toLowerCase()
    );

    if (existingFlavor) {
      return res.status(400).json({
        success: false,
        error: 'Flavor option already exists'
      });
    }

    menuItem.flavorOptions.push(flavorData);
    menuItem.allowFlavorCustomization = true;
    await menuItem.save();

    res.json({
      success: true,
      data: menuItem,
      message: 'Flavor option added successfully'
    });
  } catch (error) {
    console.error('Error adding flavor option:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add flavor option' 
    });
  }
};

// ADD ADDON OPTION TO MENU ITEM
exports.addAddonOption = async (req, res) => {
  try {
    const { id } = req.params;
    const addonData = req.body;

    // Validate required fields
    if (!addonData.name || addonData.price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Addon name and price are required'
      });
    }

    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Menu item not found' 
      });
    }

    // Check if addon already exists
    const existingAddon = menuItem.addonOptions.find(
      addon => addon.name.toLowerCase() === addonData.name.toLowerCase()
    );

    if (existingAddon) {
      return res.status(400).json({
        success: false,
        error: 'Add-on option already exists'
      });
    }

    menuItem.addonOptions.push(addonData);
    menuItem.allowAddonCustomization = true;
    await menuItem.save();

    res.json({
      success: true,
      data: menuItem,
      message: 'Add-on option added successfully'
    });
  } catch (error) {
    console.error('Error adding addon option:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add addon option' 
    });
  }
};

// REMOVE FLAVOR OPTION FROM MENU ITEM
exports.removeFlavorOption = async (req, res) => {
  try {
    const { id, flavorId } = req.params;

    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Menu item not found' 
      });
    }

    // Remove the flavor option
    const flavorIndex = menuItem.flavorOptions.findIndex(
      flavor => flavor._id.toString() === flavorId
    );

    if (flavorIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Flavor option not found'
      });
    }

    menuItem.flavorOptions.splice(flavorIndex, 1);

    // If no more flavors, disable flavor customization
    if (menuItem.flavorOptions.length === 0) {
      menuItem.allowFlavorCustomization = false;
    }

    await menuItem.save();

    res.json({
      success: true,
      data: menuItem,
      message: 'Flavor option removed successfully'
    });
  } catch (error) {
    console.error('Error removing flavor option:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove flavor option' 
    });
  }
};

// REMOVE ADDON OPTION FROM MENU ITEM
exports.removeAddonOption = async (req, res) => {
  try {
    const { id, addonId } = req.params;

    const menuItem = await Menu.findById(id);
    if (!menuItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Menu item not found' 
      });
    }

    // Remove the addon option
    const addonIndex = menuItem.addonOptions.findIndex(
      addon => addon._id.toString() === addonId
    );

    if (addonIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Add-on option not found'
      });
    }

    menuItem.addonOptions.splice(addonIndex, 1);

    // If no more addons, disable addon customization
    if (menuItem.addonOptions.length === 0) {
      menuItem.allowAddonCustomization = false;
    }

    await menuItem.save();

    res.json({
      success: true,
      data: menuItem,
      message: 'Add-on option removed successfully'
    });
  } catch (error) {
    console.error('Error removing addon option:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove addon option' 
    });
  }
};