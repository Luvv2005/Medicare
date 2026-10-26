import { Router } from 'express';
import { listMine, markAllRead, markRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect); // har logged-in role ke liye

router.get('/', listMine);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;