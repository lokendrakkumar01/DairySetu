import { Router } from 'express';
import { getSettings, updateSettings, getDairyProfile, updateDairyProfile } from '../controllers/settings.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/profile', getDairyProfile);
router.put('/profile', updateDairyProfile);

export default router;
