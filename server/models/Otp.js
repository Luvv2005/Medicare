import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ['verify', 'reset'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Mongo khud delete kar deta hai
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export default mongoose.model('Otp', otpSchema);