import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: {
      type: String,
      enum: ['chat', 'prescription', 'doctor-photo', 'doctor-doc', 'product'],
      required: true,
    },
    name: String,
    mime: String,
    size: Number,
    data: { type: Buffer, select: false }, // file ke bytes (queries mein default se nahi aate)
    ref: { type: mongoose.Schema.Types.ObjectId },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('File', fileSchema);