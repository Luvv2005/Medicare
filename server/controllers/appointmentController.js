import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Appointment from '../models/Appointment.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  HOLD_MINUTES, isValidDate, checkWindow, generateSlots, slotInstant,
} from '../utils/slots.js';

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

  // Pay at clinic sirf in-person ke liye, aur sirf jab doctor ne allow kiya ho
  if (paymentMethod === 'clinic' && (mode !== 'in-person' || !doctor.payAtClinic))
    return res.status(400).json({ message: 'Pay at clinic is not available for this appointment' });

  const windowError = checkWindow(date);
  if (windowError) return res.status(400).json({ message: windowError });

  // Slot sach mein doctor ki availability mein hai?
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

  // Patient ki khud ki do appointments ek hi samay par nahi
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
      // Online: pehle hold, payment Step 7 mein. Clinic: seedha confirmed.
      status: isOnlinePay ? 'held' : 'confirmed',
      paymentStatus: isOnlinePay ? 'pending' : 'pay_at_clinic',
      holdExpiresAt: isOnlinePay ? new Date(now.getTime() + HOLD_MINUTES * 60 * 1000) : undefined,
      isActive: true,
      isDemo: doctor.isDemo,
    });
  } catch (err) {
    // Unique index ne doosra booking rok diya
    if (err.code === 11000)
      return res.status(409).json({ message: 'Sorry, this slot was just booked by someone else' });
    throw err;
  }

  res.status(201).json({
    message: isOnlinePay
      ? `Slot held for ${HOLD_MINUTES} minutes. Complete payment to confirm (payment is built in Step 7).`
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

// PATCH /api/appointments/:id/cancel   (patient, sirf apni)
// Refund wala poora policy Step 9 mein. Abhi sirf slot release hota hai.
export const cancelAppointment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Appointment not found' });

  const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  if (!['held', 'confirmed'].includes(appointment.status))
    return res.status(400).json({ message: `Cannot cancel an appointment that is ${appointment.status}` });
  if (slotInstant(appointment.date, appointment.startTime) <= new Date())
    return res.status(400).json({ message: 'This appointment time has already passed' });

  appointment.status = 'cancelled';
  appointment.isActive = false; // slot free
  appointment.cancelledBy = 'patient';
  appointment.cancelReason = String(req.body.reason || '').slice(0, 300);
  appointment.cancelledAt = new Date();
  await appointment.save();

  res.json({ message: 'Appointment cancelled. The slot is available again.', appointment });
});