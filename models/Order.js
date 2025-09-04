const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String },
  items: [
    {
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
      quantity: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number },
  tax: { type: Number },
  pickupDate: { type: String },
  pickupTime: { type: String },
  paymentMethod: { type: String },
  status: { type: String, default: 'confirmed' },
  orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);