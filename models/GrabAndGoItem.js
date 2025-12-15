const mongoose = require('mongoose');

const grabAndGoItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    inventory: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    isFood: {
      type: Boolean,
      default: true // true = 3% tax, false = 9.5% tax
    },
    // Nutrition info
    calories: {
      type: String,
      default: ''
    },
    protein: {
      type: String,
      default: ''
    },
    fats: {
      type: String,
      default: ''
    },
    carbs: {
      type: String,
      default: ''
    },
    available: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrabAndGoItem', grabAndGoItemSchema);
