import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    sourceType: { type: String, enum: ['appointment', 'order'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true, min: 1 }, // rupees
    reason: { type: String, default: '' },

    provider: { type: String, enum: ['mock', 'razorpay'], required: true },
    providerPaymentId: { type: String }, // kis payment ka refund
    providerRefundId: { type: String }, // gateway ka refund reference

    status: {
      type: String,
      enum: ['pending', 'initiated', 'processed', 'failed'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    failureReason: { type: String, default: '' },
    initiatedAt: { type: Date },
    processedAt: { type: Date },
    failedAt: { type: Date },

    isSimulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ek appointment/order par sirf EK refund record: duplicate refund impossible
refundSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
refundSchema.index({ provider: 1, status: 1, initiatedAt: 1 });

export default mongoose.model('Refund', refundSchema);