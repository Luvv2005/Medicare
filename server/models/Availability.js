import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday ... 6 = Saturday
    start: { type: String, required: true }, // "10:00"
    end: { type: String, required: true }, // "13:00"
    mode: { type: String, enum: ['in-person', 'online', 'both'], default: 'both' },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, unique: true },
    slotMinutes: { type: Number, default: 15 },
    sessions: [sessionSchema],
    daysOff: [{ type: String }], // "2026-11-05" jaisi chhutti ki dates

    // Doctor ne kisi din ka session cancel kiya to wo hissa yahan band ho jata hai
    blocked: [{ _id: false, date: String, from: String, to: String }],

    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Availability', availabilitySchema);
