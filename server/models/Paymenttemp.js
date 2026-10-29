import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // rupees
    currency: { type: String, default: 'INR' },

    provider: { type: String, enum: ['mock', 'razorpay'], required: true },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String },

    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    paidAt: { type: Date },
    isSimulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ek appointment ya ek order par sirf EK 'paid' payment
paymentSchema.index(
  { appointment: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'paid', appointment: { $type: 'objectId' } } }
);
paymentSchema.index(
  { order: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'paid', order: { $type: 'objectId' } } }
);

export default mongoose.model('Payment', paymentSchema);