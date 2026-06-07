import { Router } from 'express';
import { getSosSettingsController, updateSosSettingsController } from '../controllers/settings.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/sos', authenticate, getSosSettingsController);
router.patch('/sos', authenticate, authorizeAdmin, updateSosSettingsController);

export default router;
