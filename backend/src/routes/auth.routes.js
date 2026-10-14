import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import { login, register, me, forgotPassword, resetPassword } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), login);

router.post('/register', validate(registerSchema), register);

router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

router.post('/reset-password', requireAuth, validate(resetPasswordSchema), resetPassword);

router.get('/me', requireAuth, me);

export default router;