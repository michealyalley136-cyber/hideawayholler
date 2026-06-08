import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Legacy path kept for compatibility: GET /api/dashboard/admin
router.get('/admin', authenticate, authorizeAdmin, dashboard.adminDashboard);
router.get('/resident', authenticate, dashboard.residentDashboard);

export default router;
