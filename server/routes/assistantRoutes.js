import { Router } from 'express';
import { ask } from '../controllers/assistantController.js';
import { assistantLimiter } from '../middleware/limiters.js';

const router = Router();
router.post('/', assistantLimiter, ask);

export default router;