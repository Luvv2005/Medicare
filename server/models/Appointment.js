import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    date: { type: String, required: true }, // "2026-11-02"
    startTime: { type: String, required: true }, // "10:15"
    endTime: { type: String, required: true },
    mode: { type: String, enum: ['online', 'in-person'], required: true },

    // 1) Appointment status
    status: {
      type: String,
      enum: ['held', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'],
      default: 'held',
    },
    // true = ye appointment slot gher raha hai. Unique index isi par lagta hai.
    isActive: { type: Boolean, default: true },
    holdExpiresAt: { type: Date },

    // 2) Payment status (Step 7 mein use hoga)
    paymentMethod: { type: String, enum: ['online', 'clinic'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'pay_at_clinic'],
      default: 'pending',
    },
    amount: { type: Number, required: true },

    // 3) Refund status (Step 9 mein use hoga)
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'initiated', 'processed', 'failed'],
      default: 'none',
    },

    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, required: true, trim: true },
    reason: { type: String, trim: true, maxlength: 300, default: '' },

    cancelledBy: { type: String, enum: ['patient', 'doctor', 'system', ''], default: '' },
    cancelReason: { type: String, default: '' },
    cancelledAt: { type: Date },

    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// DOUBLE-BOOKING SE BACHAV: ek doctor, ek date, ek time par sirf EK active appointment
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
appointmentSchema.index({ patient: 1, date: 1 });

export default mongoose.model('Appointment', appointmentSchema);