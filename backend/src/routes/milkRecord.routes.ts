import { Router } from 'express';
import {
  createMilkRecord,
  listMilkRecords,
  updateMilkRecord,
  deleteMilkRecord,
  bulkCreateMilkRecords,
} from '../controllers/milkRecord.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listMilkRecords);
router.post('/', requireAdmin, createMilkRecord);
router.post('/bulk', requireAdmin, bulkCreateMilkRecords);
router.put('/:id', requireAdmin, updateMilkRecord);
router.delete('/:id', requireAdmin, deleteMilkRecord);

export default router;
