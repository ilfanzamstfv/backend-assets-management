import { Router } from 'express';
import {
  adminResetUserPassword,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/userController.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';

const router = Router();

router.use(requireAuth, requirePermission(MODULES.USER_MANAGEMENT, ACTIONS.MANAGE));
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/reset-password', adminResetUserPassword);
router.delete('/:id', deleteUser);

export default router;
