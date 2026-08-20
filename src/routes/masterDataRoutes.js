import { Router } from 'express';
import {
  categoryController,
  locationController,
  supplierController,
} from '../controllers/masterDataController.js';
import { ACTIONS, MODULES } from '../constants/accessControl.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';

const router = Router();

const protect = (module, action) => [requireAuth, requirePermission(module, action)];

router.get('/categories', ...protect(MODULES.CATEGORY, ACTIONS.READ), categoryController.list);
router.get('/categories/:id', ...protect(MODULES.CATEGORY, ACTIONS.READ), categoryController.getById);
router.post('/categories', ...protect(MODULES.CATEGORY, ACTIONS.CREATE), categoryController.create);
router.put('/categories/:id', ...protect(MODULES.CATEGORY, ACTIONS.UPDATE), categoryController.update);
router.delete('/categories/:id', ...protect(MODULES.CATEGORY, ACTIONS.DELETE), categoryController.remove);

router.get('/locations', ...protect(MODULES.LOCATION, ACTIONS.READ), locationController.list);
router.get('/locations/:id', ...protect(MODULES.LOCATION, ACTIONS.READ), locationController.getById);
router.post('/locations', ...protect(MODULES.LOCATION, ACTIONS.CREATE), locationController.create);
router.put('/locations/:id', ...protect(MODULES.LOCATION, ACTIONS.UPDATE), locationController.update);
router.delete('/locations/:id', ...protect(MODULES.LOCATION, ACTIONS.DELETE), locationController.remove);

router.get('/suppliers', ...protect(MODULES.SUPPLIER, ACTIONS.READ), supplierController.list);
router.get('/suppliers/:id', ...protect(MODULES.SUPPLIER, ACTIONS.READ), supplierController.getById);
router.post('/suppliers', ...protect(MODULES.SUPPLIER, ACTIONS.CREATE), supplierController.create);
router.put('/suppliers/:id', ...protect(MODULES.SUPPLIER, ACTIONS.UPDATE), supplierController.update);
router.delete('/suppliers/:id', ...protect(MODULES.SUPPLIER, ACTIONS.DELETE), supplierController.remove);

export default router;
