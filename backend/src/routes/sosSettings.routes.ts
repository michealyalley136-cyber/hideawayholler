import { Router } from 'express';
import { getSosSettingsController, updateSosSettingsController } from '../controllers/settings.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getSosSettingsController);
router.patch('/', authenticate, authorizeAdmin, updateSosSettingsController);

export default router;
