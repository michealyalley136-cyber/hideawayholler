import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/admin', authenticate, authorizeAdmin, dashboard.adminDashboard);
router.get('/resident', authenticate, dashboard.residentDashboard);

export default router;
