import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/notifications
export const listMine = asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications, unread });
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read   (sirf apni)
export const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Notification not found' });
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: n });
});