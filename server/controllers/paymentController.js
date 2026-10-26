import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Paymenttemp.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paymentMode } from '../config/payment.js';
import { notifyBooking } from '../utils/notify.js';

// GET /api/payments/config
export const getConfig = (req, res) => {
  res.json({ mode: paymentMode() });
};

// POST /api/payments/mock-confirm   body: { appointmentId, outcome: 'success' | 'failure' }
// SIRF development. Production mein paymentMode() 'off' hota hai.
export const mockConfirm = asyncHandler(async (req, res) => {
  if (paymentMode() !== 'mock')
    return res.status(503).json({
      message: 'Online payment is not available yet. Please choose pay at clinic.',
    });

  const { appointmentId, outcome } = req.body;
  if (!mongoose.isValidObjectId(appointmentId))
    return res.status(400).json({ message: 'Invalid appointment' });
  if (!['success', 'failure'].includes(outcome))
    return res.status(400).json({ message: 'outcome must be success or failure' });

  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  if (appt.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This appointment is not an online-payment booking' });

  if (appt.paymentStatus === 'paid' && appt.status === 'confirmed')
    return res.json({ message: 'Payment already completed', appointment: appt });

  if (appt.status !== 'held')
    return res.status(400).json({ message: `This appointment is ${appt.status}, payment is not possible` });
  if (!appt.holdExpiresAt || appt.holdExpiresAt <= new Date())
    return res.status(400).json({ message: 'Slot hold expired. Please book the slot again.' });

  const stamp = `${appt._id}_${Date.now()}`;

  if (outcome === 'failure') {
    await Payment.create({
      appointment: appt._id,
      patient: req.user._id,
      amount: appt.amount,
      provider: 'mock',
      providerOrderId: `mock_order_${stamp}`,
      status: 'failed',
      isSimulated: true,
    });
    return res.status(402).json({ message: 'Simulated payment failed. You can try again.' });
  }

  const confirmed = await Appointment.findOneAndUpdate(
    {
      _id: appt._id,
      patient: req.user._id,
      status: 'held',
      isActive: true,
      holdExpiresAt: { $gt: new Date() },
    },
    { status: 'confirmed', paymentStatus: 'paid', $unset: { holdExpiresAt: 1 } },
    { new: true }
  );
  if (!confirmed)
    return res.status(409).json({ message: 'Slot hold expired. Please book the slot again.' });

  await Payment.create({
    appointment: appt._id,
    patient: req.user._id,
    amount: appt.amount,
    provider: 'mock',
    providerOrderId: `mock_order_${stamp}`,
    providerPaymentId: `mock_pay_${stamp}`,
    status: 'paid',
    paidAt: new Date(),
    isSimulated: true,
  });

  await notifyBooking(confirmed);

  res.json({ message: 'Test payment successful. Appointment confirmed.', appointment: confirmed });
});

// GET /api/payments/history   (patient, sirf apna)
export const getHistory = asyncHandler(async (req, res) => {
  const [payments, orders, refunds] = await Promise.all([
    Payment.find({ patient: req.user._id, status: 'paid' }).populate({
      path: 'appointment',
      select: 'date startTime doctor',
      populate: { path: 'doctor', select: 'name' },
    }),
    Order.find({ user: req.user._id, paymentStatus: 'paid' }).select(
      'orderNo total paymentMethod payment createdAt'
    ),
    Refund.find({ patient: req.user._id }).sort({ createdAt: -1 }),
  ]);

  const paid = [
    ...payments.map((p) => ({
      id: String(p._id),
      kind: 'Appointment',
      title: `Consultation with ${p.appointment?.doctor?.name || 'doctor'}${
        p.appointment ? ` on ${p.appointment.date}` : ''
      }`,
      amount: p.amount,
      date: p.paidAt || p.createdAt,
      method: 'Online',
      reference: p.providerPaymentId || '',
      simulated: Boolean(p.isSimulated),
    })),
    ...orders.map((o) => ({
      id: String(o._id),
      kind: 'Order',
      title: `Medicine order ${o.orderNo}`,
      amount: o.total,
      date: o.payment?.paidAt || o.createdAt,
      method: o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online',
      reference: o.payment?.providerPaymentId || '',
      simulated: Boolean(o.payment?.isSimulated),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    payments: paid,
    refunds: refunds.map((r) => ({
      id: String(r._id),
      sourceType: r.sourceType,
      amount: r.amount,
      status: r.status,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      simulated: r.isSimulated,
    })),
  });
});