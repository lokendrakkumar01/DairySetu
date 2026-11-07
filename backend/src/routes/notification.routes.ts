import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/responseHelper';
import Notification from '../models/Notification';
import { Types } from 'mongoose';
import { AuthRequest } from '../types';
import { Response } from 'express';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
  const dairyId = new Types.ObjectId(req.user.dairyId);
  const query: Record<string, unknown> = { dairyId };
  if (req.user.role === 'customer' && req.user.customerId) {
    query.$or = [{ userId: new Types.ObjectId(req.user.userId) }, { userId: null }];
  }
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50);
  sendSuccess(res, notifications, 'Notifications fetched');
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  sendSuccess(res, null, 'Marked as read');
});

export default router;
