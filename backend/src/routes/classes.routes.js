import { Router } from 'express';
import {
    createClass,
    deleteClass,
    getClasses,
    updateClass,
} from '../controllers/classes.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createClassSchema, updateClassSchema } from '../schemas/class.schema.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER), getClasses);
router.post('/', requireAuth, requireRole(ROLES.MANAGER), validate(createClassSchema), createClass);
router.put('/:id', requireAuth, requireRole(ROLES.MANAGER), validate(updateClassSchema), updateClass);
router.patch('/:id', requireAuth, requireRole(ROLES.MANAGER), validate(updateClassSchema), updateClass);
router.delete('/:id', requireAuth, requireRole(ROLES.MANAGER), deleteClass);

export default router;