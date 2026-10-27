import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { notify } from './notify.js';
import { emitToUser } from '../socket.js';
import { APPROACH_AHEAD } from '../config/queue.js';

export const sessionOf = (startTime) => (startTime < '13:00' ? 'morning' : 'evening');

export const LIVE = ['waiting', 'called', 'in_consultation'];

export const liveQueue = (doctorId, date, session) =>
  Appointment.find({
    doctor: doctorId,
    date,
    session,
    status: 'confirmed',
    queueStatus: { $in: LIVE },
  }).sort({ token: 1 });

// Abhi kaun sa token chal raha hai
export const nowServing = (live) => {
  const cur =
    live.find((a) => a.queueStatus === 'in_consultation') ||
    live.find((a) => a.queueStatus === 'called');
  return cur ? cur.token : null;
};

export const aheadOf = (live, appt) => live.filter((a) => a.token < appt.token).length;

// Queue badalne ke baad: "turn approaching" notification aur sabko live signal
export async function afterQueueChange({ doctorId, date, session, extraUserIds = [], skipId }) {
  try {
    const [doctor, live] = await Promise.all([
      Doctor.findById(doctorId).select('user'),
      liveQueue(doctorId, date, session),
    ]);

    for (const a of live) {
      if (a.queueStatus !== 'waiting' || a.approachNotified) continue;
      if (skipId && String(a._id) === String(skipId)) continue;
      const ahead = aheadOf(live, a);
      if (ahead <= APPROACH_AHEAD) {
        const r = await Appointment.updateOne(
          { _id: a._id, approachNotified: { $ne: true } },
          { approachNotified: true }
        );
        if (r.modifiedCount) {
          await notify(a.patient, {
            type: 'queue',
            title: 'Your turn is approaching',
            message: `Token #${a.token}: ${ahead} patient(s) ahead of you. Please stay near the clinic.`,
            link: '/dashboard',
          });
        }
      }
    }

    const ids = new Set([...live.map((a) => String(a.patient)), ...extraUserIds.map(String)]);
    if (doctor) ids.add(String(doctor.user));
    ids.forEach((id) => emitToUser(id, 'queue:update'));
  } catch (err) {
    console.error('Queue update failed:', err.message);
  }
}