import { Router } from 'express';
import {
  listCustomers,
  createCustomerHandler as createCustomer,
  getCustomer,
  updateCustomerHandler as updateCustomer,
  deleteCustomerHandler as deleteCustomer,
  resetPassword,
  getCustomerStatement,
} from '../controllers/customer.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listCustomers);
router.post('/', requireAdmin, createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', requireAdmin, updateCustomer);
router.delete('/:id', requireAdmin, deleteCustomer);
router.post('/:id/reset-password', requireAdmin, resetPassword);
router.get('/:id/statement', getCustomerStatement);

export default router;
