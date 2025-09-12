const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id: String, // Can be composite ID for customized items
  originalId: { // Original menu item ID (keeping your existing menuItemId concept)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedFlavor: {
    name: String,
    price: {
      type: Number,
      default: 0
    }
  },
  selectedAddons: [{
    name: String,
    price: {
      type: Number,
      required: true
    }
  }],
  customizations: {
    flavor: String,
    addons: [String]
  }
});

const orderSchema = new mongoose.Schema({
  // Keeping your existing structure but enhancing it
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  
  // Enhanced customer object (for compatibility with frontend)
  customer: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  // Updated items structure
  items: [orderItemSchema],
  
  // New field for customer notes
  customerNotes: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // Keeping your existing fields
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number },
  tax: { type: Number },
  total: { type: Number }, // For frontend compatibility
  pickupDate: { type: String },
  pickupTime: { type: String },
  paymentMethod: { type: String },
  status: { type: String, default: 'confirmed' },
  orderDate: { type: Date, default: Date.now },
  
  // Admin fields
  adminNotes: {
    type: String,
    default: ''
  },
  preparationTime: {
    type: Number, // minutes
    default: 20
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);