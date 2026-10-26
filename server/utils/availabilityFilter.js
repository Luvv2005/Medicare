import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Appointment from '../models/Appointment.js';
import { istToday, addDays, generateSlots, slotInstant } from './slots.js';

export const AVAILABILITY_RANGES = ['today', 'tomorrow', 'week'];

const datesFor = (range) => {
  const today = istToday();
  if (range === 'today') return [today];
  if (range === 'tomorrow') return [addDays(today, 1)];
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
};

// Un doctors ki ids jinke us range mein kam se kam ek asli free slot hai
export async function doctorIdsAvailable(baseFilter, range, mode) {
  const doctors = await Doctor.find(baseFilter).select('_id modes');
  if (!doctors.length) return [];

  const ids = doctors.map((d) => d._id);
  const dates = datesFor(range);
  const now = new Date();
  const wantMode = ['online', 'in-person'].includes(mode) ? mode : undefined;

  const [avails, appts] = await Promise.all([
    Availability.find({ doctor: { $in: ids } }),
    Appointment.find({
      doctor: { $in: ids },
      date: { $in: dates },
      isActive: true,
      $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
    }).select('doctor date startTime'),
  ]);

  const availBy = new Map(avails.map((a) => [String(a.doctor), a]));
  const taken = new Set(appts.map((a) => `${a.doctor}|${a.date}|${a.startTime}`));

  const result = [];
  for (const d of doctors) {
    const av = availBy.get(String(d._id));
    if (!av) continue;

    const allowed = [];
    if (d.modes.online) allowed.push('online');
    if (d.modes.inPerson) allowed.push('in-person');

    let found = false;
    for (const date of dates) {
      if (found) break;
      if (av.daysOff.includes(date)) continue;
      found = generateSlots(av, date, wantMode).some(
        (s) =>
          s.modes.some((m) => allowed.includes(m) && (!wantMode || m === wantMode)) &&
          !taken.has(`${d._id}|${date}|${s.startTime}`) &&
          slotInstant(date, s.startTime) > now
      );
    }
    if (found) result.push(d._id);
  }
  return result;
}