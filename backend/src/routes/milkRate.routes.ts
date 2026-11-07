import { Router } from 'express';
import {
  getCurrentRates,
  createRate,
  getRateHistory,
} from '../controllers/milkRate.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCurrentRates);
router.post('/', requireAdmin, createRate);
router.get('/history/:customerId', requireAdmin, getRateHistory);

export default router;
