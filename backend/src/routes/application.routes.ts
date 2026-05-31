import { Router } from 'express';
import * as app from '../controllers/application.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, app.listApplications);
router.post('/', authenticate, app.apply);
router.patch('/:id/review', authenticate, authorizeAdmin, app.reviewApplication);

export default router;
