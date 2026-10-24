import { Router } from 'express';
import {
  bookAppointment,
  myAppointments,
  doctorAppointments,
  cancelAppointment,
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, authorize('patient'), bookAppointment);
router.get('/mine', protect, authorize('patient'), myAppointments);
router.get('/doctor', protect, authorize('doctor'), doctorAppointments);
router.patch('/:id/cancel', protect, authorize('patient'), cancelAppointment);

export default router;