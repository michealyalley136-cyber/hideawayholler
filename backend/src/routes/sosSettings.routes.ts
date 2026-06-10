import { Router, Response, NextFunction } from 'express';
import { getSosSettingsController, updateSosSettingsController } from '../controllers/settings.controller';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

function blockSuperAdminSosSettings(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'SOS settings are managed by Hideaway Holler admins only.' });
  }
  next();
}

router.get('/', authenticate, blockSuperAdminSosSettings, getSosSettingsController);
router.patch('/', authenticate, authorizeAdmin, updateSosSettingsController);

export default router;
