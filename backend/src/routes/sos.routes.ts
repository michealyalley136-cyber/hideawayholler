import { Router } from 'express';
import * as sos from '../controllers/sos.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/active', authenticate, sos.getActiveSosAlert);
router.post('/', authenticate, sos.createSosAlert);
router.get('/', authenticate, authorizeAdmin, sos.listSosAlerts);
router.get('/:id', authenticate, authorizeAdmin, sos.getSosAlert);
router.patch('/:id/resident', authenticate, sos.residentSosAction);
router.post('/:id/location', authenticate, sos.addSosLocation);
router.patch('/:id/admin', authenticate, authorizeAdmin, sos.adminSosAction);

export default router;
