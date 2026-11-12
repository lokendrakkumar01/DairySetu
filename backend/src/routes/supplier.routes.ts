import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createSupplier, getSupplier, listSuppliers, updateSupplier } from '../controllers/supplier.controller';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', listSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplier);
router.put('/:id', updateSupplier);
export default router;
