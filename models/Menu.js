const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  available: { type: Boolean, default: true },
  imageUrl: String
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
