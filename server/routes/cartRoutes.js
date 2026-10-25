import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem } from '../controllers/cartController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('patient'));

router.get('/', getCart);
router.post('/items', addItem);
router.patch('/items/:productId', updateItem);
router.delete('/items/:productId', removeItem);

export default router;