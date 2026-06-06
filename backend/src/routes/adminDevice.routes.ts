import { Router } from 'express';
import { listAdminDevices, registerAdminDevice, updateAdminDevice } from '../controllers/adminDevice.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorizeAdmin, listAdminDevices);
router.post('/', authenticate, authorizeAdmin, registerAdminDevice);
router.patch('/', authenticate, authorizeAdmin, updateAdminDevice);

export default router;
