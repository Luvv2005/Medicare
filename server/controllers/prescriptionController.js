import mongoose from 'mongoose';
import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';
import { removeUpload } from '../config/upload.js';
import { createFileDoc } from '../utils/fileStore.js';
import { notify } from '../utils/notify.js';
import { logAudit } from '../utils/audit.js';

// POST /api/prescriptions   (patient, form: file, note)
export const uploadPrescription = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a prescription file' });
  if ((await Prescription.countDocuments({ user: req.user._id, status: 'pending' })) >= 5) {
    await removeUpload(req.file);
    return res.status(400).json({ message: 'You already have 5 prescriptions waiting for review' });
  }
  const f = await createFileDoc(req.file, req.user._id, 'prescription');
  if (!f) return res.status(400).json({ message: 'That is not a valid JPG, PNG, WEBP or PDF file' });
  const p = await Prescription.create({
    user: req.user._id, file: f._id, fileName: f.name, note: String(req.body.note || '').slice(0, 200),
  });
  res.status(201).json({ message: 'Prescription uploaded. It will be usable after admin approval.', prescription: p });
});

// GET /api/prescriptions/mine
export const myPrescriptions = asyncHandler(async (req, res) => {
  const list = await Prescription.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
  const ids = list.filter((p) => p.order).map((p) => p.order);
  const orders = await Order.find({ _id: { $in: ids } }).select('status');
  const live = new Set(orders.filter((o) => o.status !== 'cancelled').map((o) => String(o._id)));
  res.json({
    prescriptions: list.map((p) => ({
      ...p.toObject(),
      usable: p.status === 'approved' && !(p.order && live.has(String(p.order))),
    })),
  });
});

// GET /api/admin-verify/prescriptions?status=pending
export const adminList = asyncHandler(async (req, res) => {
  const filter = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
  const list = await Prescription.find(filter).populate('user', 'name email').sort({ createdAt: 1 }).limit(100);
  res.json({ prescriptions: list });
});

// PATCH /api/admin-verify/prescriptions/:id/review   body: { action: 'approve'|'reject', note }
export const adminReview = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Not found' });
  const { action } = req.body;
  const note = String(req.body.note || '').trim().slice(0, 200);
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
  if (action === 'reject' && note.length < 5) return res.status(400).json({ message: 'Please give a reason (min 5 characters)' });

  const p = await Prescription.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: action === 'approve' ? 'approved' : 'rejected', reviewNote: note, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!p) return res.status(400).json({ message: 'Only a pending prescription can be reviewed' });

  await logAudit(req, action === 'approve' ? 'PRESCRIPTION_APPROVED' : 'PRESCRIPTION_REJECTED', 'Prescription', p._id, { note });
  await notify(p.user, {
    type: 'prescription',
    title: `Prescription ${p.status}`,
    message: p.status === 'approved'
      ? 'Your prescription was approved. You can now order your prescription medicines.'
      : `Your prescription was rejected: ${note}`,
    link: '/cart',
  });
  res.json({ prescription: p });
});