import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from '../utils/audit.js';
import { DOCTOR_STATUS } from '../utils/constants.js';

// GET /api/admin/users
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ count: users.length, users });
});

// GET /api/admin/doctors?status=pending
export const listDoctors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    if (!DOCTOR_STATUS.includes(req.query.status))
      return res.status(400).json({ message: 'Invalid status' });
    filter.status = req.query.status;
  }
  const doctors = await Doctor.find(filter)
    .populate('user', 'name email phone isActive')
    .sort({ createdAt: -1 });
  res.json({ count: doctors.length, doctors });
});

const findDoctorOr404 = async (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ message: 'Doctor not found' });
    return null;
  }
  const doctor = await Doctor.findById(id);
  if (!doctor) res.status(404).json({ message: 'Doctor not found' });
  return doctor;
};

// PATCH /api/admin/doctors/:id/approve
export const approveDoctor = asyncHandler(async (req, res) => {
  const doctor = await findDoctorOr404(req.params.id, res);
  if (!doctor) return;
  if (doctor.status === 'approved')
    return res.status(400).json({ message: 'Doctor is already approved' });

  const previous = doctor.status;
  doctor.status = 'approved';
  doctor.rejectionReason = '';
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();
  await doctor.save();

  await logAudit(req, 'DOCTOR_APPROVED', 'Doctor', doctor._id, { previous });
  res.json({ message: 'Doctor approved', doctor });
});

// PATCH /api/admin/doctors/:id/reject   body: { "reason": "..." }
export const rejectDoctor = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5)
    return res.status(400).json({ message: 'Please give a rejection reason (min 5 characters)' });

  const doctor = await findDoctorOr404(req.params.id, res);
  if (!doctor) return;
  if (doctor.status === 'rejected')
    return res.status(400).json({ message: 'Doctor is already rejected' });

  const previous = doctor.status;
  doctor.status = 'rejected';
  doctor.rejectionReason = reason;
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();
  await doctor.save();

  await logAudit(req, 'DOCTOR_REJECTED', 'Doctor', doctor._id, { previous, reason });
  res.json({ message: 'Doctor rejected', doctor });
});

// GET /api/admin/audit-logs
export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('actor', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ count: logs.length, logs });
});