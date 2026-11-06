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
import { notSelf } from '../middleware/notSelf.js';

const router = Router();
const buyer = authorize('patient', 'doctor');

router.post('/', protect, buyer, notSelf, bookAppointment);
router.get('/mine', protect, buyer, myAppointments);
router.get('/doctor', protect, authorize('doctor'), doctorAppointments);
router.post('/doctor/cancel-session', protect, authorize('doctor'), doctorCancelSession);
router.get('/:id/cancel-preview', protect, buyer, cancelPreview);
router.patch('/:id/cancel', protect, buyer, cancelAppointment);
router.patch('/:id/reschedule', protect, buyer, rescheduleAppointment);
router.patch('/:id/doctor-cancel', protect, authorize('doctor'), doctorCancel);

export default router;