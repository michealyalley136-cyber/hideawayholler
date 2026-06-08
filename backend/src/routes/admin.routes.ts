import { Router } from 'express';
import * as sos from '../controllers/sos.controller';
import { registerAdminDevice } from '../controllers/adminDevice.controller';
import { authenticate, authorizeAdmin, authorizeAdminOrSuperAdmin, authorizeSuperAdmin } from '../middleware/auth';

const router = Router();

router.post('/sos/enable-device', authenticate, authorizeAdmin, registerAdminDevice);
router.post('/sos/test', authenticate, authorizeSuperAdmin, sos.createTestSosAlert);
router.get('/sos/config', authenticate, authorizeAdmin, sos.getSosPushConfig);
router.get('/sos/active', authenticate, authorizeAdmin, sos.listActiveAdminSosAlerts);
router.get('/sos/history', authenticate, authorizeAdminOrSuperAdmin, sos.listSosHistory);
router.post('/sos/:sosAlertId/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/:sosAlertId/resolve', authenticate, authorizeAdmin, sos.resolveSosAlert);
router.post('/sos/:sosAlertId/mute', authenticate, authorizeAdmin, sos.muteSosAlert);

export default router;
