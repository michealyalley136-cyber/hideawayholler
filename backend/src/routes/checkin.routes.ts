import { Router } from 'express';
import * as checkin from '../controllers/checkin.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, checkin.getCheckIn);
router.get('/pending', authenticate, authorizeAdmin, checkin.listPendingCheckIns);
router.post('/', authenticate, upload.array('photos', 10), checkin.submitCheckIn);
router.post('/approve', authenticate, authorizeAdmin, checkin.approveCheckIn);
router.post('/reject', authenticate, authorizeAdmin, checkin.rejectCheckIn);
router.post('/:id/approve', authenticate, authorizeAdmin, checkin.approveCheckIn);

export default router;
