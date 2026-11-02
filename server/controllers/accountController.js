import crypto from 'crypto';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import Cart from '../models/Cart.js';
import Notification from '../models/Notification.js';
import Prescription from '../models/Prescription.js';
import Waitlist from '../models/Waitlist.js';
import File from '../models/File.js';
import asyncHandler from '../utils/asyncHandler.js';
import { istToday } from '../utils/slots.js';
import { issue, check } from './otpController.js';

// Delete tab block hota hai jab koi kaam adhura ho
async function blocker(user) {
  const today = istToday();
  const live = { $in: ['held', 'confirmed'] };

  if (user.role === 'patient') {
    if (await Appointment.exists({ patient: user._id, status: live, date: { $gte: today } }))
      return 'You have upcoming appointments. Please cancel or complete them first.';
    if (await Order.exists({ user: user._id, status: { $in: ['pending_payment', 'placed', 'confirmed', 'shipped'] } }))
      return 'You have an order in progress. Wait until it is delivered or cancel it first.';
    if (await Refund.exists({ patient: user._id, status: { $in: ['pending', 'initiated'] } }))
      return 'You have a refund in progress. Please wait until it is processed.';
  }
  if (user.role === 'doctor') {
    const d = await Doctor.findOne({ user: user._id }).select('_id');
    if (d && (await Appointment.exists({ doctor: d._id, status: live, date: { $gte: today } })))
      return 'You have upcoming appointments. Cancel them or complete them first.';
  }
  return null;
}

// POST /api/auth/send-delete-otp
export const sendDeleteOtp = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be deleted here' });
  const block = await blocker(req.user);
  if (block) return res.status(400).json({ message: block });
  try {
    const r = await issue(req.user.email, 'delete');
    if (r.wait) return res.status(429).json({ message: 'Please wait a minute before asking for another code' });
  } catch {
    return res.status(503).json({ message: 'Email service is not available right now' });
  }
  res.json({ message: 'We sent a 6-digit code to your email. It is valid for 10 minutes.' });
});

// POST /api/auth/delete-account   body: { code }
export const deleteAccount = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be deleted here' });
  const block = await blocker(req.user);
  if (block) return res.status(400).json({ message: block });
  if (!(await check(req.user.email, 'delete', req.body.code)))
    return res.status(400).json({ message: 'Invalid or expired code' });

  const id = req.user._id;

  if (req.user.role === 'doctor') {
    await Doctor.updateOne(
      { user: id },
      {
        status: 'rejected', rejectionReason: 'Account deleted by the doctor', reviewedAt: new Date(),
        name: 'Deleted doctor', profilePhoto: '', documents: [], bio: '', languages: [],
      }
    );
  }

  await Promise.all([
    Cart.deleteOne({ user: id }),
    Notification.deleteMany({ user: id }),
    Prescription.deleteMany({ user: id }),
    File.deleteMany({ owner: id }),
    Waitlist.updateMany({ patient: id, isOpen: true }, { status: 'cancelled', isOpen: false }),
  ]);

  // Account anonymize: login band, email aazad (dobara register ho sakta hai)
  const u = await User.findById(id).select('+password');
  u.name = 'Deleted user';
  u.email = `deleted-${id}@deleted.invalid`;
  u.phone = '';
  u.gender = '';
  u.avatar = '';
  u.address = { line: '', city: '', state: '', pincode: '' };
  u.isActive = false;
  u.isEmailVerified = false;
  u.isPhoneVerified = false;
  u.deletedAt = new Date();
  u.password = `${crypto.randomBytes(24).toString('hex')}aA1`;
  await u.save();

  res.json({ message: 'Your account has been deleted.' });
});