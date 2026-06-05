import { Router } from 'express';
import * as profile from '../controllers/profile.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/residents', authenticate, authorizeAdmin, profile.listResidents);
router.get('/', authenticate, profile.getProfile);
router.get('/:userId', authenticate, profile.getProfile);
router.patch('/avatar', authenticate, upload.single('photo'), profile.uploadAvatar);
router.delete('/avatar', authenticate, profile.deleteAvatar);
router.patch('/', authenticate, profile.updateProfile);
router.patch('/:userId/avatar', authenticate, authorizeAdmin, upload.single('photo'), profile.uploadAvatar);
router.delete('/:userId/avatar', authenticate, authorizeAdmin, profile.deleteAvatar);
router.patch('/:userId', authenticate, profile.updateProfile);
router.post('/documents', authenticate, upload.single('file'), profile.uploadDocument);

export default router;
