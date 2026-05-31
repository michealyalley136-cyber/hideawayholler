import { Router } from 'express';
import * as payment from '../controllers/payment.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, payment.listPayments);
router.post('/', authenticate, authorizeAdmin, payment.createPayment);
router.patch('/:id', authenticate, authorizeAdmin, payment.updatePayment);
router.post('/:id/receipt', authenticate, upload.single('file'), payment.uploadReceipt);

export default router;
