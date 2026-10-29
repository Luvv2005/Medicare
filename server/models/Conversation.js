import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: String, default: '' },
    lastAt: { type: Date, default: Date.now },
    unread: {
      patient: { type: Number, default: 0 },
      doctor: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ patient: 1, doctor: 1 }, { unique: true });
conversationSchema.index({ doctorUser: 1, lastAt: -1 });

export default mongoose.model('Conversation', conversationSchema);