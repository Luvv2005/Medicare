import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { sendVerifyOtp, verifyEmail, forgotPassword, resetPassword } from '../controllers/otpController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

router.post('/send-verify-otp', protect, authLimiter, sendVerifyOtp);
router.post('/verify-email', protect, authLimiter, verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;