import { Router } from 'express';
import { createOrAssignHouse, listHouseAssignments, updateHouseAssignment } from '../controllers/houseAssignment.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listHouseAssignments);
router.post('/', authenticate, authorizeAdmin, createOrAssignHouse);
router.patch('/', authenticate, authorizeAdmin, updateHouseAssignment);

export default router;
