import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    date: { type: String, required: true }, // "2026-11-02"
    startTime: { type: String, required: true }, // "10:15"
    endTime: { type: String, required: true },
    mode: { type: String, enum: ['online', 'in-person'], required: true },
    session: { type: String, enum: ['morning', 'evening'] },

    // 1) Appointment status
    status: {
      type: String,
      enum: ['held', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'],
      default: 'held',
    },
    isActive: { type: Boolean, default: true },
    holdExpiresAt: { type: Date },

    // 2) Payment status
    paymentMethod: { type: String, enum: ['online', 'clinic'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'pay_at_clinic'],
      default: 'pending',
    },
    amount: { type: Number, required: true },

    // 3) Refund status
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'initiated', 'processed', 'failed'],
      default: 'none',
    },
    refundAmount: { type: Number, default: 0 },

    // Queue (in-person)
    token: { type: Number },
    queueStatus: {
      type: String,
      enum: ['none', 'waiting', 'called', 'in_consultation', 'done'],
      default: 'none',
    },
    checkedInAt: { type: Date },
    calledAt: { type: Date },
    completedAt: { type: Date },
    noShowAt: { type: Date },
    approachNotified: { type: Boolean, default: false },

    rescheduleCount: { type: Number, default: 0 },
    waitlist: { type: mongoose.Schema.Types.ObjectId, ref: 'Waitlist' },

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

// DOUBLE-BOOKING SE BACHAV
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
// Ek doctor, date, session mein ek token sirf ek baar
appointmentSchema.index(
  { doctor: 1, date: 1, session: 1, token: 1 },
  { unique: true, partialFilterExpression: { token: { $type: 'number' } } }
);
appointmentSchema.index({ patient: 1, date: 1 });

export default mongoose.model('Appointment', appointmentSchema);