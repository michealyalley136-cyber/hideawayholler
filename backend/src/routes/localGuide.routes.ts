import { Router } from 'express';
import * as guide from '../controllers/localGuide.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, guide.listPlaces);
router.post('/', authenticate, authorizeAdmin, guide.createPlace);
router.patch('/:id', authenticate, authorizeAdmin, guide.updatePlace);
router.delete('/:id', authenticate, authorizeAdmin, guide.deletePlace);

export default router;
