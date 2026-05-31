import { Router } from 'express';
import * as maintenance from '../controllers/maintenance.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, maintenance.listMaintenance);
router.get('/:id', authenticate, maintenance.getMaintenance);
router.post('/', authenticate, upload.array('media', 5), maintenance.createMaintenance);
router.patch('/:id', authenticate, authorizeAdmin, maintenance.updateMaintenance);

export default router;
