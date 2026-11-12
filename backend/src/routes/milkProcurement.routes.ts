import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createProcurement, listProcurements, updateProcurement } from '../controllers/milkProcurement.controller';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', listProcurements);
router.post('/', createProcurement);
router.put('/:id', updateProcurement);
export default router;
