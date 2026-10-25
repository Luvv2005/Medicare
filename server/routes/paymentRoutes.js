import { Router } from 'express';
import { getConfig, mockConfirm } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/config', getConfig);
router.post('/mock-confirm', protect, authorize('patient'), mockConfirm);

export default router;