import { Router } from 'express';
import * as housing from '../controllers/housing.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/occupancy', authenticate, housing.getOccupancy);
router.get('/properties', authenticate, housing.listProperties);
router.post('/properties', authenticate, authorizeAdmin, housing.createProperty);
router.post('/properties/:propertyId/buildings', authenticate, authorizeAdmin, housing.createBuilding);
router.post('/buildings/:buildingId/rooms', authenticate, authorizeAdmin, housing.createRoom);
router.post('/assign', authenticate, authorizeAdmin, housing.assignRoom);

export default router;
