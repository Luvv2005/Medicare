import { Router } from 'express';
import { joinWaitlist, myWaitlist, acceptOffer, leaveOrDecline } from '../controllers/waitlistController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('patient'));

router.post('/', joinWaitlist);
router.get('/mine', myWaitlist);
router.post('/:id/accept', acceptOffer);
router.delete('/:id', leaveOrDecline);

export default router;