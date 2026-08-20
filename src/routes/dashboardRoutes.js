import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requirePermission(MODULES.DASHBOARD, ACTIONS.READ),
  getDashboardSummary
);

export default router;
