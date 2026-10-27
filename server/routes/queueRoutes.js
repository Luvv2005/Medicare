import { Router } from 'express';
import { myQueue, doctorQueue, patientCheckIn, doctorAction } from '../controllers/queueController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/mine', protect, authorize('patient'), myQueue);
router.get('/doctor', protect, authorize('doctor'), doctorQueue);
router.post('/:id/check-in', protect, authorize('patient'), patientCheckIn);
router.patch('/:id/action', protect, authorize('doctor'), doctorAction);

export default router;