import { Router } from 'express';
import * as supply from '../controllers/supply.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, supply.listSupplyRequests);
router.post('/', authenticate, supply.createSupplyRequest);
router.patch('/:id', authenticate, authorizeAdmin, supply.updateSupplyRequest);

export default router;
