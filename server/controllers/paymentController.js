import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Paymenttemp.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paymentMode } from '../config/payment.js';
import { notifyBooking } from '../utils/notify.js';

// GET /api/payments/config  (login zaroori nahi)
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

  // Sirf patient ki apni appointment
  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  if (appt.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This appointment is not an online-payment booking' });

  // Duplicate request: pehle se paid hai to wahi result do
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
    // Appointment 'held' hi rehti hai, patient retry kar sakta hai
    return res.status(402).json({ message: 'Simulated payment failed. You can try again.' });
  }

  // Success: sirf agar abhi bhi held, active aur hold expire nahi hua
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