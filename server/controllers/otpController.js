import crypto from 'crypto';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendMail } from '../utils/mailer.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hash = (email, purpose, code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}|${purpose}|${code}`).digest('hex');
const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// 60 second ke andar dobara code nahi
async function issue(email, purpose) {
  const old = await Otp.findOne({ email, purpose });
  if (old && Date.now() - old.sentAt.getTime() < 60000) return { wait: true };
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.findOneAndUpdate(
    { email, purpose },
    {
      codeHash: hash(email, purpose, code), attempts: 0, sentAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await sendMail(
    email,
    purpose === 'reset' ? 'MediCare password reset code' : 'MediCare verification code',
    `Your MediCare code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`
  );
  return {};
}

// Max 5 galat koshish, 10 minute validity
async function check(email, purpose, code) {
  const otp = await Otp.findOneAndUpdate({ email, purpose }, { $inc: { attempts: 1 } }, { new: true });
  if (!otp || otp.expiresAt < new Date() || otp.attempts > 5) return false;
  if (!same(otp.codeHash, hash(email, purpose, String(code || '')))) return false;
  await Otp.deleteOne({ _id: otp._id });
  return true;
}

// POST /api/auth/send-verify-otp   (login zaroori)
export const sendVerifyOtp = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });
  try {
    const r = await issue(req.user.email, 'verify');
    if (r.wait) return res.status(429).json({ message: 'Please wait a minute before asking for another code' });
  } catch {
    return res.status(503).json({ message: 'Email service is not available right now' });
  }
  res.json({ message: 'We sent a 6-digit code to your email. It is valid for 10 minutes.' });
});

// POST /api/auth/verify-email   body: { code }
export const verifyEmail = asyncHandler(async (req, res) => {
  if (!(await check(req.user.email, 'verify', req.body.code)))
    return res.status(400).json({ message: 'Invalid or expired code' });
  await User.updateOne({ _id: req.user._id }, { isEmailVerified: true });
  res.json({ message: 'Email verified' });
});

// POST /api/auth/forgot-password   body: { email }   (hamesha same jawab, email exist karta hai ya nahi chhupa rehta hai)
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailRegex.test(email)) return res.status(400).json({ message: 'Please enter a valid email' });
  const user = await User.findOne({ email });
  if (user && user.isActive) await issue(email, 'reset').catch((e) => console.error('Reset mail failed:', e.message));
  res.json({ message: 'If this email is registered, a 6-digit code has been sent.' });
});

// POST /api/auth/reset-password   body: { email, code, password }
export const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { code, password } = req.body;
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return res.status(400).json({ message: 'Password must be 8+ characters with at least one letter and one number' });
  if (!(await check(email, 'reset', code))) return res.status(400).json({ message: 'Invalid or expired code' });

  const user = await User.findOne({ email }).select('+password');
  if (!user) return res.status(400).json({ message: 'Invalid or expired code' });
  user.password = password;
  user.isEmailVerified = true;
  await user.save();
  res.json({ message: 'Password changed. You can log in now.' });
});