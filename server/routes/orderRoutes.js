import { Router } from 'express';
import { placeOrder, myOrders, mockPayOrder, cancelOrder } from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('patient'));

router.post('/', placeOrder);
router.get('/mine', myOrders);
router.post('/:id/mock-pay', mockPayOrder);
router.patch('/:id/cancel', cancelOrder);

export default router;