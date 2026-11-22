import { Router } from 'express';
import {
    createClass,
    deleteClass,
    enrollClass,
    getClasses,
    getClassEnrollments,
    unenrollClass,
    updateClass,
} from '../controllers/classes.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createClassSchema, updateClassSchema } from '../schemas/class.schema.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.CLIENT, ROLES.TRAINER), getClasses);
router.get('/:id/enrollments', requireAuth, requireRole(ROLES.MANAGER, ROLES.TRAINER), getClassEnrollments);
router.post('/:id/enroll', requireAuth, requireRole(ROLES.CLIENT), enrollClass);
router.delete('/:id/enroll', requireAuth, requireRole(ROLES.CLIENT), unenrollClass);

router.post('/', requireAuth, requireRole(ROLES.MANAGER), validate(createClassSchema), createClass);
router.put('/:id', requireAuth, requireRole(ROLES.MANAGER), validate(updateClassSchema), updateClass);
router.patch('/:id', requireAuth, requireRole(ROLES.MANAGER), validate(updateClassSchema), updateClass);
router.delete('/:id', requireAuth, requireRole(ROLES.MANAGER), deleteClass);

export default router;