import User from '../models/User.js';
import { sendMail, mailConfigured } from './mailer.js';

// Sirf ye types email par jayenge. Chat aur queue nahi.
const EMAIL_TYPES = new Set([
  'appointment', 'appointment_cancelled', 'refund', 'order', 'prescription', 'waitlist',
]);

const base = () => (process.env.CLIENT_URL || '').replace(/\/$/, '');

// Privacy: email mein sirf title aur login link. Detail login ke baad dikhti hai.
export async function emailNotification(userId, { type, title, link }) {
  if (process.env.EMAIL_NOTIFICATIONS === 'off') return;
  if (!EMAIL_TYPES.has(type) || !mailConfigured()) return;

  const user = await User.findById(userId).select('name email isActive');
  if (!user || !user.isActive || !user.email) return;

  await sendMail(
    user.email,
    `MediCare: ${title}`,
    `Hello ${user.name.split(' ')[0]},\n\n` +
      `You have an update on MediCare: ${title}.\n\n` +
      `For your privacy, details are not included in this email. Please log in to view them:\n` +
      `${base()}${link || '/dashboard'}\n\n` +
      `If you did not expect this, you can ignore this email.\n\nMediCare`
  );
}