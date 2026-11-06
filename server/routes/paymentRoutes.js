import { Router } from 'express';
import {
  getConfig, mockConfirm, getHistory, createAppointmentOrder, createMedicineOrder, verifyPayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

// Webhook yahan nahi, server.js mein hai (raw body chahiye)
const router = Router();
const buyer = authorize('patient', 'doctor');

router.get('/config', getConfig);
router.get('/history', protect, buyer, getHistory);
router.post('/mock-confirm', protect, buyer, mockConfirm);
router.post('/create-order', protect, buyer, createAppointmentOrder);
router.post('/orders/:id/create-order', protect, buyer, createMedicineOrder);
router.post('/verify', protect, buyer, verifyPayment);

export default router;