import { Router } from 'express';
import { forDoctor, eligible, createReview } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/doctor/:id', forDoctor);
router.get('/eligible/:doctorId', protect, authorize('patient'), eligible);
router.post('/', protect, authorize('patient'), createReview);

export default router;