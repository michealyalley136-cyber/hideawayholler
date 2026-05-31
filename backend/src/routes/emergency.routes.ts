import { Router } from 'express';
import * as emergency from '../controllers/emergency.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, emergency.listEmergencyContacts);
router.post('/', authenticate, authorizeAdmin, emergency.createEmergencyContact);
router.patch('/:id', authenticate, authorizeAdmin, emergency.updateEmergencyContact);

export default router;
