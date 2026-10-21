import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/; // 10 digit Indian mobile number

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  // Sirf ye 4 fields lete hain. role body se KABHI nahi lete.
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

  // select('+password') kyunki model mein password hidden hai
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');

  // Same message dono cases mein, taaki attacker ko pata na chale email exist karta hai ya nahi
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Your account has been disabled' });
  }

  res.json({ user, token: generateToken(user) });
});

// GET /api/auth/me  (login zaroori)
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});