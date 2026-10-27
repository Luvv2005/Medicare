import { Router } from 'express';
import {
  bookAppointment,
  myAppointments,
  doctorAppointments,
  cancelPreview,
  cancelAppointment,
  rescheduleAppointment,
  doctorCancel,
  doctorCancelSession,
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, authorize('patient'), bookAppointment);
router.get('/mine', protect, authorize('patient'), myAppointments);
router.get('/doctor', protect, authorize('doctor'), doctorAppointments);
router.post('/doctor/cancel-session', protect, authorize('doctor'), doctorCancelSession);
router.get('/:id/cancel-preview', protect, authorize('patient'), cancelPreview);
router.patch('/:id/cancel', protect, authorize('patient'), cancelAppointment);
router.patch('/:id/reschedule', protect, authorize('patient'), rescheduleAppointment);
router.patch('/:id/doctor-cancel', protect, authorize('doctor'), doctorCancel);

export default router;