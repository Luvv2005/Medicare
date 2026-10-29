import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    fileName: String,
    note: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    order: { type: mongoose.Schema.Types.ObjectId, default: null }, // kis order mein use hua
  },
  { timestamps: true }
);

prescriptionSchema.index({ user: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Prescription', prescriptionSchema);