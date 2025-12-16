const mongoose = require('mongoose');

const flavorOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  }
});

const addonOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  }
});

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    available: { type: Boolean, default: true },
    imageUrl: { type: String },
    calories: { type: String, default: '' },
    protein: { type: String, default: '' },
    fats: { type: String, default: '' },
    carbs: { type: String, default: '' },
    flavorOptions: [flavorOptionSchema],
    addonOptions: [addonOptionSchema],
    allowFlavorCustomization: {
      type: Boolean,
      default: false
    },
    allowAddonCustomization: {
      type: Boolean,
      default: false
    },
    // Grab & Go specific fields
    isGrabAndGo: {
      type: Boolean,
      default: false
    },
    inventory: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Menu', menuSchema);