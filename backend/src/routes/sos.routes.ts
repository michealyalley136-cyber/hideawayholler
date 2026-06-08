import { Router } from 'express';
import * as sos from '../controllers/sos.controller';
import { authenticate, authorizeAdminOrSuperAdmin } from '../middleware/auth';

const router = Router();

router.get('/active', authenticate, sos.getActiveSosAlert);
router.post('/', authenticate, sos.createSosAlert);
router.post('/trigger', authenticate, sos.createSosAlert);
router.get('/', authenticate, authorizeAdminOrSuperAdmin, sos.listSosAlerts);
router.get('/:id', authenticate, authorizeAdminOrSuperAdmin, sos.getSosAlert);
router.patch('/:id/resident', authenticate, sos.residentSosAction);
router.post('/:id/location', authenticate, sos.addSosLocation);
router.patch('/:id/admin', authenticate, authorizeAdminOrSuperAdmin, sos.adminSosAction);

export default router;
