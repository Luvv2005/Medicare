import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listUsers,
  listDoctors,
  approveDoctor,
  rejectDoctor,
  listAuditLogs,
} from '../controllers/adminController.js';

const router = Router();

// Is file ke SAARE routes sirf admin ke liye
router.use(protect, authorize('admin'));

router.get('/users', listUsers);
router.get('/doctors', listDoctors);
router.patch('/doctors/:id/approve', approveDoctor);
router.patch('/doctors/:id/reject', rejectDoctor);
router.get('/audit-logs', listAuditLogs);

export default router;