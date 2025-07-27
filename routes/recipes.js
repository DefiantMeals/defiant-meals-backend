// routes/recipes.js
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const auth = require('../middleware/auth');

// @route   GET /api/recipes
// @desc    Get all public recipes + user's private recipes
// @access  Public (but shows more if authenticated)
router.get('/', async (req, res) => {
  try {
    let filter = { isPublic: true };
    
    // If user is authenticated, also show their private recipes
    if (req.user) {
      filter = {
        $or: [
          { isPublic: true },
          { createdBy: req.user.id }
        ]
      };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search functionality
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Difficulty filter
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    const recipes = await Recipe.find(filter)
      .populate('createdBy', 'username')
      .select('-reviews') // Don't include reviews in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Recipe.countDocuments(filter);

    res.json({
      recipes,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/recipes/my
// @desc    Get current user's recipes
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const recipes = await Recipe.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.json(recipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/recipes/:id
// @desc    Get single recipe by ID
// @access  Public for public recipes, Private for user's private recipes
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('reviews.user', 'username');

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Check if recipe is private and user is not the owner
    if (!recipe.isPublic && (!req.user || recipe.createdBy._id.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(recipe);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/recipes
// @desc    Create a new recipe
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      prepTime,
      servings,
      difficulty,
      category,
      tags,
      nutrition,
      image,
      isPublic
    } = req.body;

    // Validation
    if (!title || !ingredients || !instructions || !cookingTime || !prepTime || !servings || !category) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: title, ingredients, instructions, cookingTime, prepTime, servings, category' 
      });
    }

    const recipe = new Recipe({
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      prepTime,
      servings,
      difficulty,
      category,
      tags: tags || [],
      nutrition,
      image,
      isPublic: isPublic || false,
      createdBy: req.user.id
    });

    await recipe.save();
    
    // Populate the creator info for response
    await recipe.populate('createdBy', 'username');

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/recipes/:id
// @desc    Update a recipe
// @access  Private (only recipe owner)
router.put('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Check if user is the owner
    if (recipe.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      prepTime,
      servings,
      difficulty,
      category,
      tags,
      nutrition,
      image,
      isPublic
    } = req.body;

    // Update fields
    if (title) recipe.title = title;
    if (description) recipe.description = description;
    if (ingredients) recipe.ingredients = ingredients;
    if (instructions) recipe.instructions = instructions;
    if (cookingTime) recipe.cookingTime = cookingTime;
    if (prepTime) recipe.prepTime = prepTime;
    if (servings) recipe.servings = servings;
    if (difficulty) recipe.difficulty = difficulty;
    if (category) recipe.category = category;
    if (tags !== undefined) recipe.tags = tags;
    if (nutrition) recipe.nutrition = nutrition;
    if (image !== undefined) recipe.image = image;
    if (isPublic !== undefined) recipe.isPublic = isPublic;

    await recipe.save();
    await recipe.populate('createdBy', 'username');

    res.json({
      message: 'Recipe updated successfully',
      recipe
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/recipes/:id
// @desc    Delete a recipe
// @access  Private (only recipe owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Check if user is the owner
    if (recipe.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Recipe.findByIdAndDelete(req.params.id);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/recipes/:id/review
// @desc    Add a review to a recipe
// @access  Private
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a rating between 1 and 5' });
    }

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Check if recipe is public or user owns it
    if (!recipe.isPublic && recipe.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user already reviewed this recipe
    const existingReview = recipe.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this recipe' });
    }

    // Add review
    recipe.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    // Update average rating
    const totalRating = recipe.reviews.reduce((sum, review) => sum + review.rating, 0);
    recipe.rating = totalRating / recipe.reviews.length;

    await recipe.save();
    await recipe.populate('reviews.user', 'username');

    res.json({
      message: 'Review added successfully',
      recipe
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;