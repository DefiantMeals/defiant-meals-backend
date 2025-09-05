const Category = require('../models/Category');

// GET /api/categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ sortOrder: 1, name: 1 }); // Sort by sortOrder first, then alphabetically
    
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/categories/:id
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description, available, sortOrder } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      available: available !== undefined ? available : true,
      sortOrder: sortOrder || 0
    };
    
    const newCategory = new Category(categoryData);
    await newCategory.save();
    
    res.status(201).json(newCategory);
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error
      res.status(400).json({ message: 'Category already exists' });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, available, sortOrder } = req.body;
    
    // If updating name, check for duplicates
    if (name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (available !== undefined) updateData.available = available;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const categoryToDelete = await Category.findById(req.params.id);
    if (!categoryToDelete) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // TODO: Check if any menu items use this category
    // For now, we'll allow deletion - you can add this check later
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};