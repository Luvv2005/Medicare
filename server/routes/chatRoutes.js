import { Router } from 'express';
import { listConversations, startConversation, getMessages, sendMessage } from '../controllers/chatController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadOne } from '../config/upload.js';
import { chatLimiter, uploadLimiter } from '../middleware/limiters.js';

const router = Router();
router.use(protect, authorize('patient', 'doctor'));

router.get('/conversations', listConversations);
router.post('/start', authorize('patient'), startConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', chatLimiter, uploadLimiter, uploadOne('file'), sendMessage);

export default router;