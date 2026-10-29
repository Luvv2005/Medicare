import mongoose from 'mongoose';
import Waitlist from '../models/Waitlist.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  HOLD_MINUTES, isValidDate, checkWindow, generateSlots, slotInstant,
} from '../utils/slots.js';
import { notifyBooking } from '../utils/notify.js';
import { offerFreedSlot } from '../utils/waitlist.js';
import { paymentMode } from '../config/payment.js';

const phoneRegex = /^[6-9]\d{9}$/;

const blocking = (now) => ({
  isActive: true,
  $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
});

// POST /api/waitlist
export const joinWaitlist = asyncHandler(async (req, res) => {
  const { doctorId, date, mode, reason } = req.body;
  const patientName = String(req.body.patientName || req.user.name || '').trim();
  const patientPhone = String(req.body.patientPhone || req.user.phone || '').trim();

  if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: 'Invalid doctor' });
  if (!isValidDate(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
  if (!['online', 'in-person'].includes(mode))
    return res.status(400).json({ message: 'mode must be online or in-person' });
  if (patientName.length < 2) return res.status(400).json({ message: 'Patient name is required' });
  if (!phoneRegex.test(patientPhone))
    return res.status(400).json({ message: 'Valid 10-digit patient phone is required' });

  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved' });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (mode === 'online' && !doctor.modes.online)
    return res.status(400).json({ message: 'This doctor does not offer online consultation' });
  if (mode === 'in-person' && !doctor.modes.inPerson)
    return res.status(400).json({ message: 'This doctor does not offer in-person visits' });

  const windowError = checkWindow(date);
  if (windowError) return res.status(400).json({ message: windowError });

  const av = await Availability.findOne({ doctor: doctor._id });
  if (!av || av.daysOff.includes(date))
    return res.status(400).json({ message: 'Doctor is not available on this date' });

  const now = new Date();
  const upcoming = generateSlots(av, date, mode).filter((s) => slotInstant(date, s.startTime) > now);
  if (upcoming.length === 0)
    return res.status(400).json({ message: 'There are no upcoming slots on this date' });

  const taken = await Appointment.find({ doctor: doctor._id, date, ...blocking(now) }).select('startTime');
  const takenSet = new Set(taken.map((a) => a.startTime));
  if (upcoming.some((s) => !takenSet.has(s.startTime)))
    return res.status(400).json({ message: 'Slots are still available on this date. Please book one directly.' });

  try {
    const entry = await Waitlist.create({
      patient: req.user._id, doctor: doctor._id, date, mode, patientName, patientPhone,
      reason: String(reason || '').slice(0, 300),
    });
    res.status(201).json({
      message: 'You are on the waiting list. We will notify you if a slot opens up.',
      entry,
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'You are already on the waiting list for this day' });
    throw err;
  }
});

// GET /api/waitlist/mine
export const myWaitlist = asyncHandler(async (req, res) => {
  const entries = await Waitlist.find({ patient: req.user._id, isOpen: true })
    .populate('doctor', 'name specialization payAtClinic modes')
    .sort({ createdAt: -1 });
  res.json({ entries: entries.filter((e) => e.doctor) });
});

// POST /api/waitlist/:id/accept   body: { paymentMethod }
export const acceptOffer = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Offer not found' });
  const { paymentMethod } = req.body;
  if (!['online', 'clinic'].includes(paymentMethod))
    return res.status(400).json({ message: 'paymentMethod must be online or clinic' });

  const w = await Waitlist.findOne({ _id: req.params.id, patient: req.user._id, status: 'offered' });
  if (!w) return res.status(404).json({ message: 'No active offer found' });

  const now = new Date();
  if (!w.offer?.expiresAt || w.offer.expiresAt <= now)
    return res.status(400).json({ message: 'This offer has expired' });

  const doctor = await Doctor.findById(w.doctor);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  if (paymentMethod === 'clinic' && (w.mode !== 'in-person' || !doctor.payAtClinic))
    return res.status(400).json({ message: 'Pay at clinic is not available for this appointment' });
  if (paymentMethod === 'online' && paymentMode() === 'off')
    return res.status(400).json({ message: 'Online payment is not available right now. Choose pay at clinic if offered.' });

  const update =
    paymentMethod === 'clinic'
      ? { paymentMethod: 'clinic', paymentStatus: 'pay_at_clinic', status: 'confirmed', $unset: { holdExpiresAt: 1 } }
      : { paymentMethod: 'online', holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60 * 1000) };

  const appt = await Appointment.findOneAndUpdate(
    { _id: w.offer.appointment, patient: req.user._id, status: 'held', isActive: true, holdExpiresAt: { $gt: now } },
    update,
    { new: true }
  );
  if (!appt) return res.status(409).json({ message: 'This offer is no longer available' });

  await Waitlist.updateOne({ _id: w._id, status: 'offered' }, { status: 'booked', isOpen: false });
  if (appt.status === 'confirmed') await notifyBooking(appt);

  res.json({
    message:
      paymentMethod === 'online'
        ? `Slot held for ${HOLD_MINUTES} minutes. Complete payment to confirm.`
        : 'Appointment confirmed. Pay at the clinic.',
    appointment: appt,
    needsPayment: paymentMethod === 'online',
  });
});

// DELETE /api/waitlist/:id
export const leaveOrDecline = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Entry not found' });

  const left = await Waitlist.findOneAndUpdate(
    { _id: req.params.id, patient: req.user._id, status: 'waiting' },
    { status: 'cancelled', isOpen: false },
    { new: true }
  );
  if (left) return res.json({ message: 'Removed from the waiting list.' });

  const declined = await Waitlist.findOneAndUpdate(
    { _id: req.params.id, patient: req.user._id, status: 'offered' },
    { status: 'declined', isOpen: false },
    { new: true }
  );
  if (!declined) return res.status(404).json({ message: 'Entry not found' });

  await Appointment.updateOne(
    { _id: declined.offer?.appointment, status: 'held', isActive: true },
    { status: 'expired', isActive: false }
  );
  if (declined.offer?.startTime) {
    await offerFreedSlot({
      doctorId: declined.doctor, date: declined.date, startTime: declined.offer.startTime, mode: declined.mode,
    });
  }
  res.json({ message: 'Offer declined. The slot goes to the next person.' });
});