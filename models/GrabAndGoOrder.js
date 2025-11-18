const mongoose = require('mongoose');

const grabAndGoOrderItemSchema = new mongoose.Schema({
  menuItemId: {
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
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const grabAndGoOrderSchema = new mongoose.Schema({
  // Customer information
  customerName: {
    type: String,
    default: 'Guest'
  },
  customerEmail: {
    type: String,
    default: ''
  },
  customerPhone: {
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
  
  // Payment method and Stripe info
  paymentMethod: {
    type: String,
    enum: ['card'],
    default: 'card'
  },
  stripeSessionId: {
    type: String
  },
  stripePaymentIntentId: {
    type: String
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'paid', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('GrabAndGoOrder', grabAndGoOrderSchema);