import { Router } from 'express';
import passport from '../config/passport.js';
import { githubCallback, googleCallback } from '../controllers/authController.js';
import {
  createUser,
  forgotPassword,
  getCurrentUser,
  loginUser,
  resetPassword,
  verifyResetCode,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', createUser);
router.post('/login', loginUser);
router.get('/me', requireAuth, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

router.get('/github', passport.authenticate('github', { scope: ['user:email', 'user:profile'], session: false }));
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', session: false }),
  githubCallback
);

export default router;
