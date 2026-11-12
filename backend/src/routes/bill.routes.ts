import { Router } from 'express';
import {
  generateBillHandler,
  listBills,
  getBill,
  finalizeBillHandler,
  closeBillHandler,
  getBillPdfData,
} from '../controllers/bill.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listBills);
router.post('/generate', requireAdmin, generateBillHandler);
router.get('/:id', getBill);
router.post('/:id/finalize', requireAdmin, finalizeBillHandler);
router.post('/:id/close', requireAdmin, closeBillHandler);
router.get('/:id/pdf-data', requireAdmin, getBillPdfData);

export default router;
