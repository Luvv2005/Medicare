import mongoose from 'mongoose';
import { SPECIALIZATIONS, DOCTOR_STATUS } from '../utils/constants.js';

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true }, // search ke liye copy

    specialization: { type: String, required: true, enum: SPECIALIZATIONS },
    qualifications: [{ type: String, trim: true }],
    experienceYears: { type: Number, required: true, min: 0, max: 70 },
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    languages: [{ type: String, trim: true }],

    registrationNumber: { type: String, required: true, trim: true },
    registrationCouncil: { type: String, required: true, trim: true },

    clinic: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      // GeoJSON: [longitude, latitude]. Maps/nearby search ke liye (Step 5 aur 10)
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined },
      },
    },

    consultationFee: { type: Number, required: true, min: 0, max: 100000 },
    modes: {
      online: { type: Boolean, default: true },
      inPerson: { type: Boolean, default: true },
    },
    payAtClinic: { type: Boolean, default: false },

    // File upload baad mein aayega. Abhi sirf fields.
    profilePhoto: { type: String, default: '' },
    documents: [{ label: String, url: String }],

    status: { type: String, enum: DOCTOR_STATUS, default: 'pending' },
    rejectionReason: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },

    // Real doctor ka rating count 0 se shuru hota hai. Demo rating par isDemo: true.
    rating: {
      value: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
      isDemo: { type: Boolean, default: false },
    },

    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ek hi registration number dobara register nahi ho sakta
doctorSchema.index({ registrationNumber: 1, registrationCouncil: 1 }, { unique: true });
doctorSchema.index({ status: 1, specialization: 1, 'clinic.city': 1 });

export default mongoose.model('Doctor', doctorSchema);