import { Router } from 'express';
import { z } from 'zod';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { validateBody } from '../middleware/validate.js';
import { changePassword, forgotPassword, login, logout, me, register, refresh, resetPassword, verifyEmail, resendVerification } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const verifyEmailSchema = z.object({ token: z.string() });

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);
authRouter.get('/me', protect, me);
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
authRouter.post('/change-password', protect, validateBody(changePasswordSchema), changePassword);
authRouter.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);
authRouter.post('/resend-verification', protect, resendVerification);
