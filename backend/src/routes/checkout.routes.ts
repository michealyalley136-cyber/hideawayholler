import { Router } from 'express';
import * as checkout from '../controllers/checkout.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, checkout.getCheckOut);
router.post('/', authenticate, upload.array('photos', 10), checkout.submitCheckOut);
router.post('/:id/approve', authenticate, authorizeAdmin, checkout.approveCheckOut);

export default router;
