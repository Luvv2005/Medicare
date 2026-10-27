import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import { emitToUser } from '../socket.js';

// Notification fail ho to bhi main kaam na ruke
export const notify = async (userId, { type, title, message, link = '' }) => {
  try {
    const n = await Notification.create({ user: userId, type, title, message, link });
    emitToUser(userId, 'notification:new');
    return n;
  } catch (err) {
    console.error('Notification failed:', err.message);
    return null;
  }
};

// Appointment confirm hone par patient aur doctor dono ko
export const notifyBooking = async (appt) => {
  const doctor = await Doctor.findById(appt.doctor).select('name user');
  if (!doctor) return;
  await notify(appt.patient, {
    type: 'appointment',
    title: 'Appointment confirmed',
    message: `Your appointment with ${doctor.name} is confirmed for ${appt.date} at ${appt.startTime}.`,
    link: '/dashboard',
  });
  await notify(doctor.user, {
    type: 'appointment',
    title: 'New appointment',
    message: `${appt.patientName} booked ${appt.date} at ${appt.startTime} (${appt.mode}).`,
    link: '/dashboard',
  });
  emitToUser(doctor.user, 'queue:update');
};