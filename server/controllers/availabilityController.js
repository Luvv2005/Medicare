import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import asyncHandler from '../utils/asyncHandler.js';
import { TIME_RX, isValidDate, toMin } from '../utils/slots.js';

const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];

// GET /api/doctors/me/availability
export const getMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const availability = await Availability.findOne({ doctor: doctor._id });
  res.json({
    availability: availability || { doctor: doctor._id, slotMinutes: 15, sessions: [], daysOff: [] },
  });
});

// PUT /api/doctors/me/availability
export const updateMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const { sessions = [], slotMinutes = 15, daysOff = [] } = req.body;

  const slot = Number(slotMinutes);
  if (!SLOT_OPTIONS.includes(slot))
    return res.status(400).json({ message: `Slot length must be one of ${SLOT_OPTIONS.join(', ')} minutes` });
  if (!Array.isArray(sessions) || sessions.length > 30)
    return res.status(400).json({ message: 'Invalid sessions' });
  if (!Array.isArray(daysOff) || daysOff.length > 100)
    return res.status(400).json({ message: 'Invalid days off' });

  const clean = [];
  for (const s of sessions) {
    const day = Number(s.day);
    if (!Number.isInteger(day) || day < 0 || day > 6)
      return res.status(400).json({ message: 'Day must be 0 (Sunday) to 6 (Saturday)' });
    if (!TIME_RX.test(s.start || '') || !TIME_RX.test(s.end || ''))
      return res.status(400).json({ message: 'Time must be in HH:mm format, like 09:30' });
    if (toMin(s.start) >= toMin(s.end))
      return res.status(400).json({ message: 'Session end time must be after start time' });
    if (toMin(s.end) - toMin(s.start) < slot)
      return res.status(400).json({ message: 'Session is shorter than one slot' });
    const mode = ['in-person', 'online', 'both'].includes(s.mode) ? s.mode : 'both';
    clean.push({ day, start: s.start, end: s.end, mode });
  }

  // Same din ke sessions overlap nahi hone chahiye
  for (let day = 0; day < 7; day++) {
    const list = clean.filter((s) => s.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < list.length; i++) {
      if (toMin(list[i].start) < toMin(list[i - 1].end))
        return res.status(400).json({ message: 'Sessions on the same day cannot overlap' });
    }
  }

  for (const d of daysOff) {
    if (!isValidDate(d)) return res.status(400).json({ message: `Invalid date: ${d}` });
  }

  const availability = await Availability.findOneAndUpdate(
    { doctor: doctor._id },
    { sessions: clean, slotMinutes: slot, daysOff: [...new Set(daysOff)] },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({ availability });
});