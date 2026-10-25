import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listUsers,
  listDoctors,
  approveDoctor,
  rejectDoctor,
  listAuditLogs,
} from '../controllers/adminController.js';
import {
  listProducts,
  createProduct,
  updateProduct,
  listOrders,
  updateOrderStatus,
} from '../controllers/adminStoreController.js';

const router = Router();

// Is file ke SAARE routes sirf admin ke liye
router.use(protect, authorize('admin'));

router.get('/users', listUsers);
router.get('/doctors', listDoctors);
router.patch('/doctors/:id/approve', approveDoctor);
router.patch('/doctors/:id/reject', rejectDoctor);
router.get('/audit-logs', listAuditLogs);

router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.get('/orders', listOrders);
router.patch('/orders/:id/status', updateOrderStatus);

export default router;