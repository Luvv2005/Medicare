import rateLimit from 'express-rate-limit';

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message } });

export const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.');
export const chatLimiter = make(60 * 1000, 60, 'You are sending messages too fast.');
export const assistantLimiter = make(60 * 1000, 20, 'Please wait a moment before asking again.');
export const uploadLimiter = make(10 * 60 * 1000, 40, 'Too many uploads. Please try later.');