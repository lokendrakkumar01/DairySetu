import { Router } from 'express';
import { dailyCollection, monthlySummary, outstanding, analytics } from '../controllers/report.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/daily-collection', dailyCollection);
router.get('/monthly-summary', monthlySummary);
router.get('/outstanding', outstanding);
router.get('/analytics', analytics);

export default router;
