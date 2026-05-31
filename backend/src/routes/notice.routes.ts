import { Router } from 'express';
import * as notice from '../controllers/notice.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, notice.listNotices);
router.post('/', authenticate, authorizeAdmin, notice.createNotice);
router.patch('/:id', authenticate, authorizeAdmin, notice.updateNotice);
router.delete('/:id', authenticate, authorizeAdmin, notice.deleteNotice);
router.post('/:id/read', authenticate, notice.markRead);

export default router;
