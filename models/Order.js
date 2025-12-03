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
  
  // Pickup date with cutoff validation
  pickupDate: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(date) {
        // Skip validation for admin orders
        if (this.isAdminOrder) {
          return true;
        }
        
        // Check if ordering deadline has passed
        const deadline = mongoose.model('Order').getOrderingDeadline(date);
        const now = new Date();
        return now < deadline;
      },
      message: function(props) {
        const deadline = mongoose.model('Order').getOrderingDeadline(props.value);
        return `Ordering deadline (${deadline.toLocaleString()}) has passed for this pickup date`;
      }
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
  
  // Flag for admin-created orders (bypasses validation)
  isAdminOrder: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Static method to calculate ordering deadline for a pickup date
orderSchema.statics.getOrderingDeadline = function(pickupDate) {
  const pickup = new Date(pickupDate);
  const deadline = new Date(pickup);
  
  // Go back 8 days from pickup
  deadline.setDate(pickup.getDate() - 8);
  
  // Set to midnight (23:59:59) on that day
  deadline.setHours(23, 59, 59, 999);
  
  return deadline;
};

// Static method to validate if ordering is still open for a pickup date
orderSchema.statics.validatePickupDate = function(pickupDate) {
  const now = new Date();
  const pickup = new Date(pickupDate);
  const deadline = this.getOrderingDeadline(pickupDate);
  
  // Check if we're past the deadline
  const isValid = now < deadline;
  
  // Calculate days until pickup for messaging
  const daysUntilPickup = Math.ceil((pickup - now) / (1000 * 60 * 60 * 24));
  
  // Calculate hours until deadline for better messaging
  const hoursUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60));
  
  let message;
  if (isValid) {
    if (hoursUntilDeadline <= 24) {
      message = `Ordering closes in ${hoursUntilDeadline} hours (${deadline.toLocaleString()})`;
    } else {
      message = `Ordering closes at midnight on ${deadline.toLocaleDateString()}`;
    }
  } else {
    message = `Ordering closed on ${deadline.toLocaleDateString()} at midnight. Please select a different pickup date.`;
  }
  
  return {
    isValid,
    daysUntilPickup,
    deadline,
    message
  };
};

module.exports = mongoose.model('Order', orderSchema);