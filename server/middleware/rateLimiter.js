// import rateLimit from 'express-rate-limit';

// // Brute-force attacks rokne ke liye: 15 minute mein max 20 attempts
// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { message: 'Too many attempts. Please try again after 15 minutes.' },
// });

import rateLimit from 'express-rate-limit';

// AUTH_LIMIT env se set hoga, nahi to default 20
const max = Number(process.env.AUTH_LIMIT) || 20;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
});