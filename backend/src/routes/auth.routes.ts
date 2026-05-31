import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/register', validate(auth.registerValidation), auth.register);
router.post('/login', validate(auth.loginValidation), auth.login);
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, auth.me);

export default router;
