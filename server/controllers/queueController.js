import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Availability from '../models/Availability.js';
import Doctor from '../models/Doctor.js';
import Counter from '../models/Counter.js';
import asyncHandler from '../utils/asyncHandler.js';
import { istToday, slotInstant, isValidDate } from '../utils/slots.js';
import {
  sessionOf, liveQueue, nowServing, aheadOf, afterQueueChange,
} from '../utils/queue.js';
import { notify } from '../utils/notify.js';
import { NOSHOW_GRACE_MINUTES } from '../config/queue.js';

const graceOver = (a) =>
  Date.now() >= slotInstant(a.date, a.startTime).getTime() + NOSHOW_GRACE_MINUTES * 60 * 1000;

// Do log ek saath check-in karein to bhi har ko alag token (atomic counter)
async function nextToken(key) {
  for (let i = 0; i < 3; i++) {
    try {
      const c = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      return c.seq;
    } catch (err) {
      if (err.code !== 11000) throw err; // pehli baar ek saath create hone par retry
    }
  }
  throw new Error('Could not generate token');
}

async function assignToken(appt) {
  if (appt.status !== 'confirmed' || !appt.isActive)
    return { code: 400, message: 'Only confirmed appointments can check in' };
  if (appt.mode !== 'in-person')
    return { code: 400, message: 'Queue tokens are only for in-person visits' };
  if (appt.date !== istToday())
    return { code: 400, message: 'Check-in opens on the day of the appointment' };
  if (appt.queueStatus !== 'none') return { code: 400, message: 'Already checked in' };

  const session = sessionOf(appt.startTime);
  const token = await nextToken(`${appt.doctor}|${appt.date}|${session}`);

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: 'confirmed', queueStatus: 'none' },
    { queueStatus: 'waiting', token, session, checkedInAt: new Date(), approachNotified: false },
    { new: true }
  );
  if (!updated) return { code: 409, message: 'Already checked in' };

  await afterQueueChange({
    doctorId: updated.doctor,
    date: updated.date,
    session,
    extraUserIds: [updated.patient],
    skipId: updated._id,
  });
  return { appt: updated };
}

// POST /api/queue/:id/check-in   (patient, sirf apni)
export const patientCheckIn = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Appointment not found' });
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const r = await assignToken(appt);
  if (r.message) return res.status(r.code).json({ message: r.message });
  res.json({ message: `Checked in. Your token is #${r.appt.token}.`, appointment: r.appt });
});

// PATCH /api/queue/:id/action   body: { action }   (doctor, sirf apni appointment)
export const doctorAction = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Appointment not found' });

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const appt = await Appointment.findOne({ _id: req.params.id, doctor: doctor._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  const now = new Date();
  const session = appt.session || sessionOf(appt.startTime);
  const base = { _id: appt._id, doctor: doctor._id, status: 'confirmed' };
  let updated = null;

  if (action === 'check_in') {
    const r = await assignToken(appt);
    if (r.message) return res.status(r.code).json({ message: r.message });
    return res.json({ message: `Checked in. Token #${r.appt.token}.`, appointment: r.appt });
  }

  if (action === 'call') {
    updated = await Appointment.findOneAndUpdate(
      { ...base, mode: 'in-person', queueStatus: 'waiting' },
      { queueStatus: 'called', calledAt: now },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: 'Only a waiting patient can be called' });
    await notify(updated.patient, {
      type: 'queue',
      title: 'It is your turn',
      message: `Token #${updated.token}: please go in to see the doctor.`,
      link: '/dashboard',
    });
  } else if (action === 'start') {
    const busy = await Appointment.findOne({
      doctor: doctor._id,
      date: appt.date,
      session,
      status: 'confirmed',
      queueStatus: 'in_consultation',
      _id: { $ne: appt._id },
    });
    if (busy)
      return res.status(409).json({ message: 'Complete the current consultation first' });
    updated = await Appointment.findOneAndUpdate(
      { ...base, mode: 'in-person', queueStatus: { $in: ['waiting', 'called'] } },
      { queueStatus: 'in_consultation' },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: 'Patient must be checked in first' });
  } else if (action === 'complete') {
    let filter;
    if (appt.mode === 'in-person') {
      filter = { ...base, $or: [{ queueStatus: 'in_consultation' }, { date: { $lt: istToday() } }] };
    } else {
      if (slotInstant(appt.date, appt.startTime) > now)
        return res.status(400).json({ message: 'An online consultation can be completed after it starts' });
      filter = base;
    }
    updated = await Appointment.findOneAndUpdate(
      filter,
      { status: 'completed', queueStatus: 'done', completedAt: now },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: 'Start the consultation first' });
  } else if (action === 'no_show') {
    if (!graceOver(appt))
      return res.status(400).json({
        message: `You can mark no-show ${NOSHOW_GRACE_MINUTES} minute(s) after the appointment time`,
      });
    updated = await Appointment.findOneAndUpdate(
      { ...base, queueStatus: { $ne: 'in_consultation' } },
      { status: 'no_show', isActive: false, queueStatus: 'none', noShowAt: now },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: 'This appointment cannot be marked no-show' });
    await notify(updated.patient, {
      type: 'queue',
      title: 'Marked as no-show',
      message: `You were marked as a no-show for ${updated.date} ${updated.startTime}. There is no automatic penalty. If this is a mistake, or you paid online and want a review, contact support.`,
      link: '/dashboard',
    });
  } else {
    return res.status(400).json({ message: 'Invalid action' });
  }

  await afterQueueChange({
    doctorId: doctor._id,
    date: appt.date,
    session,
    extraUserIds: [appt.patient],
  });
  res.json({ appointment: updated });
});

// GET /api/queue/mine   (patient: aaj ki in-person appointments ka queue)
export const myQueue = asyncHandler(async (req, res) => {
  const appts = await Appointment.find({
    patient: req.user._id,
    date: istToday(),
    mode: 'in-person',
    status: { $in: ['confirmed', 'completed'] },
  });

  const cache = new Map();
  const items = [];
  for (const a of appts) {
    const session = a.session || sessionOf(a.startTime);
    const key = `${a.doctor}|${session}`;
    if (!cache.has(key)) {
      const [live, doctor, av] = await Promise.all([
        liveQueue(a.doctor, a.date, session),
        Doctor.findById(a.doctor).select('name'),
        Availability.findOne({ doctor: a.doctor }).select('slotMinutes'),
      ]);
      cache.set(key, { live, name: doctor?.name, slot: av?.slotMinutes || 15 });
    }
    const { live, name, slot } = cache.get(key);
    const checkedIn = a.token != null && a.status === 'confirmed' && a.queueStatus !== 'none';
    const ahead = checkedIn && a.queueStatus !== 'done' ? aheadOf(live, a) : null;

    items.push({
      appointmentId: String(a._id),
      doctorName: name,
      startTime: a.startTime,
      status: a.status,
      queueStatus: a.queueStatus,
      checkedIn,
      token: checkedIn ? a.token : null,
      nowServing: nowServing(live),
      ahead,
      waitMinutes: ahead !== null ? ahead * slot : null,
    });
  }
  res.json({ items });
});

// GET /api/queue/doctor?date=   (doctor, sirf apni)
export const doctorQueue = asyncHandler(async (req, res) => {
  const date = req.query.date || istToday();
  if (!isValidDate(date)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const appts = await Appointment.find({
    doctor: doctor._id,
    date,
    mode: 'in-person',
    status: { $in: ['confirmed', 'completed', 'no_show'] },
  }).sort({ startTime: 1 });

  const serving = {};
  for (const s of ['morning', 'evening']) {
    serving[s] = nowServing(await liveQueue(doctor._id, date, s));
  }

  const items = appts
    .map((a) => ({ ...a.toObject(), session: a.session || sessionOf(a.startTime), graceOver: graceOver(a) }))
    .sort(
      (x, y) =>
        x.session.localeCompare(y.session) ||
        (x.token ?? 9999) - (y.token ?? 9999) ||
        x.startTime.localeCompare(y.startTime)
    );

  res.json({ date, graceMinutes: NOSHOW_GRACE_MINUTES, serving, items });
});