const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  available: { 
    type: Boolean, 
    default: true 
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);