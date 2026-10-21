import { Router } from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Is file ke SAARE routes sirf admin ke liye
router.use(protect, authorize('admin'));

// GET /api/admin/users
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ count: users.length, users });
  })
);

export default router;