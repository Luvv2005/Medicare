import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email' });
  }
  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return res
      .status(400)
      .json({ message: 'Password must be 8+ characters with at least one letter and one number' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: 'This email is already registered' });
  }

  const user = await User.create({ name, email, phone, password, role: 'patient' });

  res.status(201).json({ user, token: generateToken(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Your account has been disabled' });
  }

  res.json({ user, token: generateToken(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile   body: { name, phone, address }
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;
  const update = {};

  if (name !== undefined) {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 60)
      return res.status(400).json({ message: 'Name must be 2 to 60 characters' });
    update.name = n;
  }

  if (phone !== undefined) {
    const p = String(phone).trim();
    if (p && !phoneRegex.test(p))
      return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    update.phone = p;
    if (p !== req.user.phone) update.isPhoneVerified = false;
  }

  if (address !== undefined) {
    const a = address || {};
    const clean = {
      line: String(a.line || '').trim().slice(0, 200),
      city: String(a.city || '').trim().slice(0, 60),
      state: String(a.state || '').trim().slice(0, 60),
      pincode: String(a.pincode || '').trim(),
    };
    if (clean.pincode && !/^\d{6}$/.test(clean.pincode))
      return res.status(400).json({ message: 'Pincode must be 6 digits' });
    update.address = clean;
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });

  if (req.user.role === 'doctor' && update.name) {
    await Doctor.updateOne({ user: req.user._id }, { name: update.name });
  }

  res.json({ user });
});