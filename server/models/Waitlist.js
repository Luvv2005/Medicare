import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: String, required: true },
    mode: { type: String, enum: ['online', 'in-person'], required: true },

    status: {
      type: String,
      enum: ['waiting', 'offered', 'booked', 'declined', 'expired', 'cancelled'],
      default: 'waiting',
    },
    isOpen: { type: Boolean, default: true }, // waiting ya offered

    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    reason: { type: String, default: '' },

    offer: {
      startTime: String,
      expiresAt: Date,
      appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    },
  },
  { timestamps: true }
);

// Ek patient ki ek doctor/date/mode par sirf ek khuli entry
waitlistSchema.index(
  { patient: 1, doctor: 1, date: 1, mode: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } }
);
waitlistSchema.index({ doctor: 1, date: 1, mode: 1, status: 1, createdAt: 1 });

export default mongoose.model('Waitlist', waitlistSchema);