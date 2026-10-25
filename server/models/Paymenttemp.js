import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // rupees
    currency: { type: String, default: 'INR' },

    // Generic fields: abhi 'mock', baad mein 'razorpay'
    provider: { type: String, enum: ['mock', 'razorpay'], required: true },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String },

    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    paidAt: { type: Date },
    isSimulated: { type: Boolean, default: false }, // nakli payment ki pehchan
  },
  { timestamps: true }
);

// Ek appointment par sirf EK 'paid' payment ho sakta hai
paymentSchema.index(
  { appointment: 1 },
  { unique: true, partialFilterExpression: { status: 'paid' } }
);

export default mongoose.model('Payment', paymentSchema);