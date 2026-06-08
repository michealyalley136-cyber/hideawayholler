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
// Single-segment routes (sosAlertId in body). Vercel's nested catch-all does not resolve
// multi-segment dynamic paths like /sos/:id/acknowledge, so these are the production-safe routes.
router.post('/sos/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/resolve', authenticate, authorizeAdmin, sos.resolveSosAlert);
router.post('/sos/mute', authenticate, authorizeAdmin, sos.muteSosAlert);
// Legacy param routes kept for local development and backward compatibility.
router.post('/sos/:sosAlertId/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/:sosAlertId/resolve', authenticate, authorizeAdmin, sos.resolveSosAlert);
router.post('/sos/:sosAlertId/mute', authenticate, authorizeAdmin, sos.muteSosAlert);

export default router;
