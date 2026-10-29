import { Router } from 'express';
import { uploadPrescription, myPrescriptions } from '../controllers/prescriptionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadOne } from '../config/upload.js';
import { uploadLimiter } from '../middleware/limiters.js';

const router = Router();
router.use(protect, authorize('patient'));

router.post('/', uploadLimiter, uploadOne('file'), uploadPrescription);
router.get('/mine', myPrescriptions);

export default router;