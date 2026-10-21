import rateLimit from 'express-rate-limit';

// Brute-force attacks rokne ke liye: 15 minute mein max 20 attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
});