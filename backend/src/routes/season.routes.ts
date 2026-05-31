import { Router } from 'express';
import * as season from '../controllers/season.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, season.listSeasons);
router.get('/:id', authenticate, season.getSeason);
router.post('/', authenticate, authorizeAdmin, season.createSeason);
router.patch('/:id', authenticate, authorizeAdmin, season.updateSeason);
router.post('/:id/end', authenticate, authorizeAdmin, season.endSeason);

export default router;
