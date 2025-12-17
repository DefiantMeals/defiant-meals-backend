const mongoose = require('mongoose');

const grabAndGoOrderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrabAndGoItem',
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
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const grabAndGoOrderSchema = new mongoose.Schema({
  // Customer information
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: ''
  },

  // Order items
  items: [grabAndGoOrderItemSchema],

  // Payment information
  totalAmount: {
    type: Number,
    required: true
  },

  // Stripe session info
  stripeSessionId: {
    type: String
  },
  stripePaymentIntentId: {
    type: String
  },

  // Order status
  status: {
    type: String,
    enum: ['pending', 'paid', 'ready', 'picked_up', 'cancelled'],
    default: 'pending'
  },

  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('GrabAndGoOrder', grabAndGoOrderSchema);
