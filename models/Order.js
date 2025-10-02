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
  // Customer information
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  
  // Enhanced customer object (for compatibility with frontend)
  customer: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  
  // Order items
  items: [orderItemSchema],
  
  // Customer notes
  customerNotes: {
    type: String,
    default: '',
    maxlength: 500
  },
  
  // Payment information
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number },
  tax: { type: Number },
  total: { type: Number },
  paymentMethod: { type: String },
  
  // UPDATED: Pickup date as Date object instead of String
  pickupDate: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(date) {
        // Validate that pickup date is at least 8 days in the future
        const now = new Date();
        const eightDaysFromNow = new Date(now);
        eightDaysFromNow.setDate(now.getDate() + 8);
        return date >= eightDaysFromNow;
      },
      message: 'Pickup date must be at least 8 days in advance'
    }
  },
  pickupTime: { type: String },
  
  // Order status
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
  },
  
  // NEW: Flag for admin-created orders (bypasses 8-day validation)
  isAdminOrder: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Static method to validate pickup date is 8 days away
orderSchema.statics.validatePickupDate = function(pickupDate) {
  const now = new Date();
  const pickup = new Date(pickupDate);
  const daysUntilPickup = Math.ceil((pickup - now) / (1000 * 60 * 60 * 24));
  
  return {
    isValid: daysUntilPickup >= 8,
    daysUntilPickup: daysUntilPickup,
    message: daysUntilPickup >= 8 
      ? 'Valid pickup date' 
      : `Pickup must be at least 8 days in advance. Selected date is only ${daysUntilPickup} days away.`
  };
};

// Static method to calculate ordering deadline for a pickup date
orderSchema.statics.getOrderingDeadline = function(pickupDate) {
  const deadline = new Date(pickupDate);
  deadline.setDate(deadline.getDate() - 8);
  deadline.setHours(12, 0, 0, 0); // Noon on the deadline day
  return deadline;
};

module.exports = mongoose.model('Order', orderSchema);