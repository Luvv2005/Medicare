import { Router } from 'express';
import { getConfig, mockConfirm, getHistory } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/config', getConfig);
router.get('/history', protect, authorize('patient'), getHistory);
router.post('/mock-confirm', protect, authorize('patient'), mockConfirm);

export default router;