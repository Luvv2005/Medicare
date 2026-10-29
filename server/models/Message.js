import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['text', 'file', 'call'], default: 'text' },
    text: { type: String, default: '' },
    fileId: { type: mongoose.Schema.Types.ObjectId },
    fileName: String,
    fileMime: String,
    fileSize: Number,
    callType: String, // audio | video
    callStatus: String, // completed | missed | declined | unavailable
    callDuration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);