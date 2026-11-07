import { Router } from 'express';
import {
  recordPayment,
  listPayments,
  getPayment,
  reversePayment,
} from '../controllers/payment.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listPayments);
router.post('/', requireAdmin, recordPayment);
router.get('/:id', getPayment);
router.post('/:id/reverse', requireAdmin, reversePayment);

export default router;
