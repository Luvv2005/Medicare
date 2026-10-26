import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from '../utils/audit.js';

const APPT_STATUSES = ['held', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'];

// GET /api/admin/appointments?status=
export const listAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    if (!APPT_STATUSES.includes(req.query.status))
      return res.status(400).json({ message: 'Invalid status' });
    filter.status = req.query.status;
  }
  const appointments = await Appointment.find(filter)
    .populate('doctor', 'name specialization')
    .populate('patient', 'name email')
    .sort({ date: -1, startTime: -1 })
    .limit(200);
  res.json({ count: appointments.length, appointments });
});

// PATCH /api/admin/users/:id/active   body: { isActive: true | false }
export const setUserActive = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'User not found' });
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be true or false' });

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.role === 'admin')
    return res.status(400).json({ message: 'Admin accounts cannot be blocked from here' });

  const user = await User.findByIdAndUpdate(target._id, { isActive }, { new: true });

  // Blocked doctor public list se hat jata hai. Unblock par admin ko dobara approve karna padta hai.
  if (target.role === 'doctor' && !isActive) {
    await Doctor.updateOne(
      { user: target._id, status: 'approved' },
      {
        status: 'rejected',
        rejectionReason: 'Account disabled by admin',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      }
    );
  }

  await logAudit(req, isActive ? 'USER_UNBLOCKED' : 'USER_BLOCKED', 'User', target._id, { role: target.role });
  res.json({ user });
});

const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
const byField = (Model, field) =>
  Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]).then(toMap);
const sumOf = (Model, match, field) =>
  Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } },
  ]).then((r) => ({ total: r[0]?.total || 0, count: r[0]?.count || 0 }));

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [users, doctors, appointments, orders, apptPaid, orderPaid, refunds] = await Promise.all([
    byField(User, 'role'),
    byField(Doctor, 'status'),
    byField(Appointment, 'status'),
    byField(Order, 'status'),
    sumOf(Appointment, { paymentStatus: 'paid' }, 'amount'),
    sumOf(Order, { paymentStatus: 'paid' }, 'total'),
    sumOf(Refund, { status: { $in: ['initiated', 'processed'] } }, 'amount'),
  ]);

  const collected = apptPaid.total + orderPaid.total;
  res.json({
    users, doctors, appointments, orders,
    money: {
      appointmentPayments: apptPaid,
      orderPayments: orderPaid,
      refunds,
      collected,
      net: collected - refunds.total,
    },
  });
});