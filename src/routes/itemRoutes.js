import { Router } from 'express';
import {
  createItem,
  deleteItem,
  getItemById,
  listItems,
  listStock,
  updateItem,
} from '../controllers/itemController.js';
import { exportItemPdf } from '../controllers/exportController.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';

const router = Router();

router.get('/', requireAuth, requirePermission(MODULES.ITEM, ACTIONS.READ), listItems);
router.get('/stock', requireAuth, requirePermission(MODULES.STOCK, ACTIONS.READ), listStock);
router.get('/:id', requireAuth, requirePermission(MODULES.ITEM, ACTIONS.READ), getItemById);
router.post('/', requireAuth, requirePermission(MODULES.ITEM, ACTIONS.CREATE), createItem);
router.put('/:id', requireAuth, requirePermission(MODULES.ITEM, ACTIONS.UPDATE), updateItem);
router.delete('/:id', requireAuth, requirePermission(MODULES.ITEM, ACTIONS.DELETE), deleteItem);
router.get(
  '/:id/export/pdf',
  requireAuth,
  requirePermission(MODULES.EXPORT_PDF, ACTIONS.EXPORT),
  exportItemPdf
);

export default router;
