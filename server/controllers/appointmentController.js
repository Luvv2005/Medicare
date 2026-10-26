import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Paymenttemp.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  HOLD_MINUTES, isValidDate, checkWindow, generateSlots, slotInstant, istToday,
} from '../utils/slots.js';
import { refundPercentFor } from '../config/policy.js';
import { startRefund } from '../utils/refunds.js';
import { notify, notifyBooking } from '../utils/notify.js';

const phoneRegex = /^[6-9]\d{9}$/;

// Ye appointments slot gher rahe hain (confirmed, ya abhi tak na-expire hua hold)
const blockingFilter = (now) => ({
  isActive: true,
  $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
});

// GET /api/doctors/:id/slots?date=2026-11-02&mode=online   (public)
export const getSlots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, mode } = req.query;

  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Doctor not found' });
  if (!isValidDate(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
  if (mode && !['online', 'in-person'].includes(mode))
    return res.status(400).json({ message: 'mode must be online or in-person' });

  const doctor = await Doctor.findOne({ _id: id, status: 'approved' }).select('modes');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const windowError = checkWindow(date);
  if (windowError) return res.status(400).json({ message: windowError });

  const availability = await Availability.findOne({ doctor: id });
  if (!availability || availability.daysOff.includes(date)) return res.json({ date, slots: [] });

  const allowed = [];
  if (doctor.modes.online) allowed.push('online');
  if (doctor.modes.inPerson) allowed.push('in-person');

  const now = new Date();
  const taken = await Appointment.find({ doctor: id, date, ...blockingFilter(now) }).select('startTime');
  const takenSet = new Set(taken.map((a) => a.startTime));

  const slots = generateSlots(availability, date, mode)
    .map((s) => ({ ...s, modes: s.modes.filter((m) => allowed.includes(m)) }))
    .filter((s) => s.modes.length > 0 && (!mode || s.modes.includes(mode)))
    .map((s) => ({
      ...s,
      available: !takenSet.has(s.startTime) && slotInstant(date, s.startTime) > now,
    }));

  res.json({ date, slotMinutes: availability.slotMinutes, slots });
});

// POST /api/appointments   (sirf patient)
export const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, startTime, mode, paymentMethod, reason } = req.body;
  const patientName = String(req.body.patientName || req.user.name || '').trim();
  const patientPhone = String(req.body.patientPhone || req.user.phone || '').trim();

  if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: 'Invalid doctor' });
  if (!isValidDate(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
  if (!['online', 'in-person'].includes(mode))
    return res.status(400).json({ message: 'mode must be online or in-person' });
  if (!['online', 'clinic'].includes(paymentMethod))
    return res.status(400).json({ message: 'paymentMethod must be online or clinic' });
  if (patientName.length < 2) return res.status(400).json({ message: 'Patient name is required' });
  if (!phoneRegex.test(patientPhone))
    return res.status(400).json({ message: 'Valid 10-digit patient phone is required' });

  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved' });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  if (mode === 'online' && !doctor.modes.online)
    return res.status(400).json({ message: 'This doctor does not offer online consultation' });
  if (mode === 'in-person' && !doctor.modes.inPerson)
    return res.status(400).json({ message: 'This doctor does not offer in-person visits' });

  if (paymentMethod === 'clinic' && (mode !== 'in-person' || !doctor.payAtClinic))
    return res.status(400).json({ message: 'Pay at clinic is not available for this appointment' });

  const windowError = checkWindow(date);
  if (windowError) return res.status(400).json({ message: windowError });

  const availability = await Availability.findOne({ doctor: doctor._id });
  if (!availability || availability.daysOff.includes(date))
    return res.status(400).json({ message: 'Doctor is not available on this date' });

  const slot = generateSlots(availability, date, mode).find((s) => s.startTime === startTime);
  if (!slot) return res.status(400).json({ message: 'This time is not an available slot' });

  const now = new Date();
  if (slotInstant(date, startTime) <= now)
    return res.status(400).json({ message: 'This slot time has already passed' });

  // Purane expire ho chuke holds ko hatao taaki slot free ho jaye
  await Appointment.updateMany(
    { doctor: doctor._id, date, startTime, isActive: true, status: 'held', holdExpiresAt: { $lte: now } },
    { status: 'expired', isActive: false }
  );

  const clash = await Appointment.findOne({
    patient: req.user._id, date, startTime, ...blockingFilter(now),
  });
  if (clash)
    return res.status(409).json({ message: 'You already have an appointment at this time' });

  const isOnlinePay = paymentMethod === 'online';

  let appointment;
  try {
    appointment = await Appointment.create({
      doctor: doctor._id,
      patient: req.user._id,
      date,
      startTime,
      endTime: slot.endTime,
      mode,
      paymentMethod,
      amount: doctor.consultationFee,
      patientName,
      patientPhone,
      reason: String(reason || '').slice(0, 300),
      status: isOnlinePay ? 'held' : 'confirmed',
      paymentStatus: isOnlinePay ? 'pending' : 'pay_at_clinic',
      holdExpiresAt: isOnlinePay ? new Date(now.getTime() + HOLD_MINUTES * 60 * 1000) : undefined,
      isActive: true,
      isDemo: doctor.isDemo,
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Sorry, this slot was just booked by someone else' });
    throw err;
  }

  if (appointment.status === 'confirmed') await notifyBooking(appointment);

  res.status(201).json({
    message: isOnlinePay
      ? `Slot held for ${HOLD_MINUTES} minutes. Complete payment to confirm.`
      : 'Appointment confirmed. Pay at the clinic.',
    appointment,
  });
});

// GET /api/appointments/mine   (patient, sirf apni)
export const myAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user._id })
    .populate('doctor', 'name specialization clinic profilePhoto isDemo')
    .sort({ date: -1, startTime: -1 });
  res.json({ count: appointments.length, appointments });
});

// GET /api/appointments/doctor?date=2026-11-02   (doctor, sirf apni)
export const doctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const filter = { doctor: doctor._id, status: { $ne: 'expired' } };
  if (req.query.date) {
    if (!isValidDate(req.query.date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    filter.date = req.query.date;
  }
  const appointments = await Appointment.find(filter).sort({ date: 1, startTime: 1 });
  res.json({ count: appointments.length, appointments });
});

// ---------- Cancellation ----------

// Cancel ho sakti hai ya nahi: error message ya null
const cancelBlocker = (appt) => {
  if (!['held', 'confirmed'].includes(appt.status))
    return `Cannot cancel an appointment that is ${appt.status}`;
  if (slotInstant(appt.date, appt.startTime) <= new Date())
    return 'This appointment time has already passed';
  return null;
};

// Patient ke cancel par kitna refund milega
const refundInfo = (appt) => {
  if (appt.paymentStatus !== 'paid')
    return { percent: 0, amount: 0, message: 'No online payment was made, so no refund is needed.' };

  const hours = (slotInstant(appt.date, appt.startTime).getTime() - Date.now()) / 3600000;
  const percent = refundPercentFor(hours);
  const amount = Math.round((appt.amount * percent) / 100);
  const message =
    percent === 0
      ? 'As per the cancellation policy, no refund applies this close to the appointment.'
      : `As per the cancellation policy you will get a ${percent}% refund (₹${amount}).`;
  return { percent, amount, message };
};

// Slot free karta hai aur zaroorat ho to refund shuru karta hai. Patient aur doctor dono yahi use karte hain.
const cancelAndRefund = async (appt, { by, reason, percent }) => {
  const cancelled = await Appointment.findOneAndUpdate(
    { _id: appt._id, isActive: true, status: { $in: ['held', 'confirmed'] } },
    {
      status: 'cancelled',
      isActive: false, // slot free
      cancelledBy: by,
      cancelReason: reason,
      cancelledAt: new Date(),
      $unset: { holdExpiresAt: 1 },
    },
    { new: true }
  );
  if (!cancelled) return null; // kisi aur ne pehle hi badal diya

  let refund = null;
  if (cancelled.paymentStatus === 'paid' && percent > 0) {
    const pay = await Payment.findOne({ appointment: cancelled._id, status: 'paid' });
    refund = await startRefund({
      sourceType: 'appointment',
      source: cancelled,
      amount: Math.round((cancelled.amount * percent) / 100),
      reason: `Appointment cancelled by ${by}`,
      providerPaymentId: pay?.providerPaymentId,
    });
  }
  return { appointment: await Appointment.findById(cancelled._id), refund };
};

const findMine = (id, userId) =>
  mongoose.isValidObjectId(id) ? Appointment.findOne({ _id: id, patient: userId }) : null;

// GET /api/appointments/:id/cancel-preview   (patient, sirf apni)
export const cancelPreview = asyncHandler(async (req, res) => {
  const appt = await findMine(req.params.id, req.user._id);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const blocked = cancelBlocker(appt);
  if (blocked) return res.status(400).json({ message: blocked });

  res.json(refundInfo(appt));
});

// PATCH /api/appointments/:id/cancel   (patient, sirf apni)
export const cancelAppointment = asyncHandler(async (req, res) => {
  const appt = await findMine(req.params.id, req.user._id);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const blocked = cancelBlocker(appt);
  if (blocked) return res.status(400).json({ message: blocked });

  const info = refundInfo(appt);
  const out = await cancelAndRefund(appt, {
    by: 'patient',
    reason: String(req.body.reason || '').slice(0, 300),
    percent: info.percent,
  });
  if (!out) return res.status(409).json({ message: 'Appointment was just updated. Please refresh.' });

  const doctor = await Doctor.findById(appt.doctor).select('name user');
  await notify(req.user._id, {
    type: 'appointment_cancelled',
    title: 'Appointment cancelled',
    message: `Your appointment with ${doctor?.name} on ${appt.date} at ${appt.startTime} is cancelled. ${info.message}`,
    link: '/dashboard',
  });
  if (doctor) {
    await notify(doctor.user, {
      type: 'appointment_cancelled',
      title: 'Patient cancelled',
      message: `${appt.patientName} cancelled the ${appt.date} ${appt.startTime} appointment. The slot is free again.`,
      link: '/dashboard',
    });
  }

  res.json({ message: `Appointment cancelled. ${info.message}`, appointment: out.appointment });
});

// Patient ko batao ki doctor ne cancel kiya, aur dobara book karne ka rasta
const tellPatient = (appt, doctor, reason, refund) =>
  notify(appt.patient, {
    type: 'appointment_cancelled',
    title: 'Appointment cancelled by doctor',
    message: `${doctor.name} cancelled your ${appt.date} ${appt.startTime} appointment. Reason: ${reason}. ${
      refund ? `A refund of ₹${refund.amount} has been initiated. ` : ''
    }You can book another slot with the same doctor or find another ${doctor.specialization}.`,
    link: `/doctors/${doctor._id}`,
  });

// PATCH /api/appointments/:id/doctor-cancel   body: { reason }   (doctor, sirf apni)
export const doctorCancel = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim().slice(0, 300);
  if (reason.length < 5)
    return res.status(400).json({ message: 'Please give a cancellation reason (min 5 characters)' });
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Appointment not found' });

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const appt = await Appointment.findOne({ _id: req.params.id, doctor: doctor._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const blocked = cancelBlocker(appt);
  if (blocked) return res.status(400).json({ message: blocked });

  // Doctor ke cancel par hamesha poora refund
  const out = await cancelAndRefund(appt, { by: 'doctor', reason, percent: 100 });
  if (!out) return res.status(409).json({ message: 'Appointment was just updated. Please refresh.' });

  await tellPatient(out.appointment, doctor, reason, out.refund);
  res.json({
    message: `Appointment cancelled. The patient has been notified${out.refund ? ' and a full refund started' : ''}.`,
    appointment: out.appointment,
  });
});

const PARTS = {
  day: ['00:00', '24:00'],
  morning: ['00:00', '13:00'],
  evening: ['13:00', '24:00'],
};

// POST /api/appointments/doctor/cancel-session   body: { date, part: day|morning|evening, reason }
export const doctorCancelSession = asyncHandler(async (req, res) => {
  const { date, part } = req.body;
  const reason = String(req.body.reason || '').trim().slice(0, 300);

  if (!isValidDate(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
  if (date < istToday()) return res.status(400).json({ message: 'You cannot cancel a past date' });
  if (!PARTS[part]) return res.status(400).json({ message: 'part must be day, morning or evening' });
  if (reason.length < 5)
    return res.status(400).json({ message: 'Please give a cancellation reason (min 5 characters)' });

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const [from, to] = PARTS[part];

  // Pehle slots band karo, taaki cancel ke dauran koi naya booking na kare
  await Availability.findOneAndUpdate(
    { doctor: doctor._id },
    { $push: { blocked: { date, from, to } } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const list = await Appointment.find({
    doctor: doctor._id,
    date,
    isActive: true,
    status: { $in: ['held', 'confirmed'] },
    startTime: { $gte: from, $lt: to },
  });

  const now = new Date();
  let cancelled = 0;
  let refunds = 0;
  for (const a of list) {
    if (slotInstant(a.date, a.startTime) <= now) continue;
    const out = await cancelAndRefund(a, { by: 'doctor', reason, percent: 100 });
    if (!out) continue;
    cancelled++;
    if (out.refund) refunds++;
    await tellPatient(out.appointment, doctor, reason, out.refund); // har patient ko alag notification
  }

  res.json({
    message: `${cancelled} appointment(s) cancelled, ${refunds} refund(s) started, all patients notified. Remaining slots in that time are now blocked.`,
    cancelled,
    refunds,
  });
});