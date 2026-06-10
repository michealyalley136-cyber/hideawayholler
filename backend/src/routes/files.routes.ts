import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { serveProtectedFile } from '../controllers/files.controller';

const router = Router();

router.get('/serve', authenticate, serveProtectedFile);

export default router;
