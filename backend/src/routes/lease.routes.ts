import { Router } from 'express';
import * as lease from '../controllers/lease.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, lease.listLeases);
router.get('/:id', authenticate, lease.getLease);
router.post('/', authenticate, authorizeAdmin, upload.single('file'), lease.createLease);
router.post('/:id/sign', authenticate, lease.signLease);

export default router;
