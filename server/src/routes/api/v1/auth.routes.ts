import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as authService from '../../../services/auth.service.js';

const emailSchema = z.string().trim().email('Invalid email').max(320);

const registerBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
});

const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').max(4096),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(registerBodySchema),
  (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof registerBodySchema>;
      res.status(201).json({ data: authService.register(body.email, body.password) });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/login', validateBody(loginBodySchema), (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof loginBodySchema>;
    res.status(200).json({ data: authService.login(body.email, body.password) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', validateBody(refreshBodySchema), (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof refreshBodySchema>;
    res.status(200).json({ data: authService.refresh(body.refreshToken) });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = authService.getSessionUser(req.user!.id);
    res.status(200).json({ data: { user } });
  } catch (err) {
    next(err);
  }
});
