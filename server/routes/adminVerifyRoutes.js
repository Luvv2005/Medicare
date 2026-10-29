import { Router } from 'express';
import { adminList, adminReview } from '../controllers/prescriptionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/prescriptions', adminList);
router.patch('/prescriptions/:id/review', adminReview);

export default router;