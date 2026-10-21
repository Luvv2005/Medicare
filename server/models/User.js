import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['patient', 'doctor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true, default: '' },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // queries mein password default se nahi aayega
    },
    role: { type: String, enum: ROLES, default: 'patient' },
    isActive: { type: Boolean, default: true }, // admin account block kar sakega
    isEmailVerified: { type: Boolean, default: false }, // OTP baad mein
    isPhoneVerified: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false }, // demo records ki pehchan
  },
  { timestamps: true }
);

// Save se pehle password hash karo (sirf jab password change hua ho)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// JSON response mein password kabhi na jaye
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);