import { Router } from 'express';
import {
  servePublic, serveProtected, uploadDoctorPhoto, uploadDoctorDoc, setDoctorLocation, uploadProductImage,
} from '../controllers/fileController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadOne } from '../config/upload.js';
import { uploadLimiter } from '../middleware/limiters.js';

const router = Router();

router.get('/public/:id', servePublic);
router.get('/:id', protect, serveProtected);
router.post('/doctor-photo', protect, authorize('doctor'), uploadLimiter, uploadOne('file'), uploadDoctorPhoto);
router.post('/doctor-doc', protect, authorize('doctor'), uploadLimiter, uploadOne('file'), uploadDoctorDoc);
router.put('/doctor-location', protect, authorize('doctor'), setDoctorLocation);
router.post('/product/:id', protect, authorize('admin'), uploadLimiter, uploadOne('file'), uploadProductImage);

export default router;