import Waitlist from '../models/Waitlist.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import { generateSlots, slotInstant } from './slots.js';
import { notify } from './notify.js';
import { emitToUser } from '../socket.js';
import { sessionOf } from './queue.js';
import { OFFER_MINUTES } from '../config/queue.js';

const blocking = (now) => ({
  isActive: true,
  $or: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { $gt: now } }],
});

// Slot khali hua: sabse purane eligible waiting patient ko 10 minute ka offer do.
// Offer ke dauran slot uske liye 'held' appointment se roka jata hai.
export async function offerFreedSlot({ doctorId, date, startTime, mode }) {
  const now = new Date();
  if (slotInstant(date, startTime) <= now) return null;

  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved' });
  if (!doctor) return null;

  const av = await Availability.findOne({ doctor: doctorId });
  if (!av || av.daysOff.includes(date)) return null;

  const slot = generateSlots(av, date, mode).find((s) => s.startTime === startTime);
  if (!slot) return null;

  const busy = await Appointment.findOne({ doctor: doctorId, date, startTime, ...blocking(now) });
  if (busy) return null;

  const candidates = await Waitlist.find({ doctor: doctorId, date, mode, status: 'waiting' }).sort({
    createdAt: 1,
  });

  for (const c of candidates) {
    const clash = await Appointment.findOne({ patient: c.patient, date, startTime, ...blocking(now) });
    if (clash) continue;

    const expiresAt = new Date(now.getTime() + OFFER_MINUTES * 60 * 1000);
    const claimed = await Waitlist.findOneAndUpdate(
      { _id: c._id, status: 'waiting' },
      { status: 'offered', offer: { startTime, expiresAt } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      const appt = await Appointment.create({
        doctor: doctorId,
        patient: c.patient,
        date,
        startTime,
        endTime: slot.endTime,
        session: sessionOf(startTime),
        mode,
        paymentMethod: 'online',
        paymentStatus: 'pending',
        amount: doctor.consultationFee,
        status: 'held',
        holdExpiresAt: expiresAt,
        isActive: true,
        patientName: c.patientName,
        patientPhone: c.patientPhone,
        reason: c.reason,
        waitlist: c._id,
        isDemo: doctor.isDemo,
      });
      claimed.offer.appointment = appt._id;
      await claimed.save();

      await notify(c.patient, {
        type: 'waitlist',
        title: 'A slot is available!',
        message: `${doctor.name} has a slot on ${date} at ${startTime}. Accept within ${OFFER_MINUTES} minutes or it goes to the next person.`,
        link: '/dashboard',
      });
      emitToUser(c.patient, 'waitlist:update');
      return claimed;
    } catch (err) {
      // Offer nahi ban paya: entry wapas waiting mein
      await Waitlist.updateOne({ _id: c._id }, { status: 'waiting', $unset: { offer: 1 } });
      if (err.code === 11000) return null; // kisi aur ne slot le liya
      throw err;
    }
  }
  return null;
}

// Jin offers ka time nikal gaya, unhe expire karke agle patient ko do
export async function expireOffers() {
  const due = await Waitlist.find({ status: 'offered', 'offer.expiresAt': { $lte: new Date() } });
  let count = 0;

  for (const w of due) {
    const x = await Waitlist.findOneAndUpdate(
      { _id: w._id, status: 'offered' },
      { status: 'expired', isOpen: false },
      { new: true }
    );
    if (!x) continue;
    count++;

    await Appointment.updateOne(
      { _id: w.offer?.appointment, status: 'held', isActive: true },
      { status: 'expired', isActive: false }
    );
    await notify(w.patient, {
      type: 'waitlist',
      title: 'Offer expired',
      message: 'The slot offer expired and was passed to the next person on the waiting list.',
      link: '/dashboard',
    });
    emitToUser(w.patient, 'waitlist:update');

    if (w.offer?.startTime) {
      await offerFreedSlot({
        doctorId: w.doctor,
        date: w.date,
        startTime: w.offer.startTime,
        mode: w.mode,
      });
    }
  }
  return count;
}