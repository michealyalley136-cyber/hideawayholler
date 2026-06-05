import { Router } from 'express';
import * as sos from '../controllers/sos.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/sos/active', authenticate, authorizeAdmin, sos.listActiveAdminSosAlerts);
router.get('/sos/history', authenticate, authorizeAdmin, sos.listSosHistory);
router.post('/sos/:sosAlertId/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/:sosAlertId/mute', authenticate, authorizeAdmin, sos.muteSosAlert);

export default router;
