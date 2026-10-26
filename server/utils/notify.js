import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';

// Notification fail ho to bhi main kaam na ruke
export const notify = (userId, { type, title, message, link = '' }) =>
  Notification.create({ user: userId, type, title, message, link }).catch((err) =>
    console.error('Notification failed:', err.message)
  );

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
};