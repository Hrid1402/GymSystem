import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { getAllPlans, getAllPlansAdmin, getPlanById, create, update, remove } from '../controllers/plans.controller.js';
import { createPlanSchema, updatePlanSchema } from '../schemas/plans.schema.js';

const router = Router();


router.get('/', getAllPlans);

router.get('/all', requireAuth, requireRole(ROLES.MANAGER), getAllPlansAdmin);

router.get('/:id', getPlanById);

router.post('/', requireAuth, requireRole(ROLES.MANAGER), validate(createPlanSchema), create);

router.patch('/:id', requireAuth, requireRole(ROLES.MANAGER), validate(updatePlanSchema), update);

router.delete('/:id', requireAuth, requireRole(ROLES.MANAGER), remove);

export default router;