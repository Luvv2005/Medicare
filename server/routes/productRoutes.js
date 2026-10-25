import { Router } from 'express';
import { getCategories, listProducts, getProduct } from '../controllers/productController.js';

const router = Router();

router.get('/categories', getCategories); // "/:id" se PEHLE
router.get('/', listProducts);
router.get('/:id', getProduct);

export default router;