import { Router } from 'express';
import {
  createPurchaseHistory,
  deletePurchaseHistory,
  getPurchaseHistoryById,
  listPurchaseHistories,
  updatePurchaseHistory,
} from '../controllers/purchaseHistoryController.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';

const router = Router();

router.get('/', requireAuth, requirePermission(MODULES.PURCHASE_HISTORY, ACTIONS.READ), listPurchaseHistories);
router.get('/:id', requireAuth, requirePermission(MODULES.PURCHASE_HISTORY, ACTIONS.READ), getPurchaseHistoryById);
router.post('/', requireAuth, requirePermission(MODULES.PURCHASE_HISTORY, ACTIONS.CREATE), createPurchaseHistory);
router.put('/:id', requireAuth, requirePermission(MODULES.PURCHASE_HISTORY, ACTIONS.UPDATE), updatePurchaseHistory);
router.delete('/:id', requireAuth, requirePermission(MODULES.PURCHASE_HISTORY, ACTIONS.DELETE), deletePurchaseHistory);

export default router;
