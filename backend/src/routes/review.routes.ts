import { Router } from 'express';
import * as reviews from '../controllers/review.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/public', reviews.publicReviews);
router.get('/mine', authenticate, reviews.myReviews);
router.get('/admin', authenticate, authorizeAdmin, reviews.adminReviews);
router.get('/', authenticate, reviews.listReviews);
router.post('/', authenticate, upload.single('photo'), reviews.createReview);
router.patch('/', authenticate, authorizeAdmin, reviews.updateReview);
router.patch('/:id', authenticate, authorizeAdmin, reviews.updateReview);

export default router;
