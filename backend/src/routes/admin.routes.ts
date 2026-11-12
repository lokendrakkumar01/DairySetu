import { Router } from 'express';
import { getDashboard, getProfile, updateProfile, cleanDairyData } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/clean-data', cleanDairyData);

export default router;
