import { Router } from 'express';
import {
  getConfig, mockConfirm, getHistory, createAppointmentOrder, createMedicineOrder, verifyPayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

// Webhook yahan nahi, server.js mein hai (raw body chahiye)
const router = Router();

router.get('/config', getConfig);
router.get('/history', protect, authorize('patient'), getHistory);
router.post('/mock-confirm', protect, authorize('patient'), mockConfirm);
router.post('/create-order', protect, authorize('patient'), createAppointmentOrder);
router.post('/orders/:id/create-order', protect, authorize('patient'), createMedicineOrder);
router.post('/verify', protect, authorize('patient'), verifyPayment);

export default router;