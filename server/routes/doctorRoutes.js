import { Router } from 'express';
import {
  getSpecializations,
  getCities,
  registerDoctor,
  listDoctors,
  getDoctor,
  getMyProfile,
  updateMyProfile,
} from '../controllers/doctorController.js';
import {
  getMyAvailability,
  updateMyAvailability,
} from '../controllers/availabilityController.js';
import { getSlots } from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/specializations', getSpecializations);
router.get('/cities', getCities);
router.post('/register', authLimiter, registerDoctor);

// "/me/..." routes "/:id" se PEHLE hone chahiye
router.get('/me/profile', protect, authorize('doctor'), getMyProfile);
router.put('/me/profile', protect, authorize('doctor'), updateMyProfile);
router.get('/me/availability', protect, authorize('doctor'), getMyAvailability);
router.put('/me/availability', protect, authorize('doctor'), updateMyAvailability);

router.get('/', listDoctors);
router.get('/:id/slots', getSlots);
router.get('/:id', getDoctor);

export default router;