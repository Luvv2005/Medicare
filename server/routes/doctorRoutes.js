import { Router } from 'express';
import {
  getSpecializations,
  registerDoctor,
  listDoctors,
  getDoctor,
  getMyProfile,
  updateMyProfile,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/specializations', getSpecializations);
router.post('/register', authLimiter, registerDoctor);

// Ye "/:id" se PEHLE hone chahiye, warna "me" ko id samajh liya jayega
router.get('/me/profile', protect, authorize('doctor'), getMyProfile);
router.put('/me/profile', protect, authorize('doctor'), updateMyProfile);

router.get('/', listDoctors);
router.get('/:id', getDoctor);

export default router;