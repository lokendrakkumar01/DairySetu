import { Router } from 'express';
import {
  adminRegister,
  adminLogin,
  customerLogin,
  refresh,
  logout,
  adminChangePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/admin/register', authLimiter, adminRegister);
router.post('/admin/login', authLimiter, adminLogin);
router.post('/customer/login', authLimiter, customerLogin);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.post('/admin/change-password', authenticate, adminChangePassword);

export default router;
