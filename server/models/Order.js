import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot: baad mein price/naam badle to purana order na badle
    name: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    requiresPrescription: { type: Boolean, default: false },
    icon: { type: String, default: '💊' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [lineSchema],

    address: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      line: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },

    // Teen alag status: order, payment, refund
    status: {
      type: String,
      enum: ['pending_payment', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
    paymentMethod: { type: String, enum: ['online', 'cod'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'cod', 'failed'], default: 'pending' },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'initiated', 'processed', 'failed'],
      default: 'none',
    },

    holdExpiresAt: { type: Date },
    payment: {
      provider: String,
      providerPaymentId: String,
      paidAt: Date,
      isSimulated: Boolean,
    },

    cancelledBy: { type: String, enum: ['patient', 'admin', 'system', ''], default: '' },
    cancelledAt: { type: Date },

    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, holdExpiresAt: 1 });

export default mongoose.model('Order', orderSchema);