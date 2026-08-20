import { Router } from 'express';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getRoleById,
  listPermissions,
  listRoles,
  updateRole,
} from '../controllers/roleController.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';

const router = Router();

router.use(requireAuth, requirePermission(MODULES.ROLE_MANAGEMENT, ACTIONS.MANAGE));
router.get('/permissions', listPermissions);
router.get('/', listRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.put('/:id/permissions', assignRolePermissions);
router.delete('/:id', deleteRole);

export default router;
