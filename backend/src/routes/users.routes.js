import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema, changeEmailSchema, changePasswordSchema } from '../schemas/user.schema.js';
import { getAllUsers, getUserById, createUser, updateUser, changeEmail, changePassword } from '../controllers/users.controller.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), getAllUsers);
router.post('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), validate(createUserSchema), createUser);
router.get('/:id', requireAuth, getUserById);
router.patch('/:id', requireAuth, validate(updateUserSchema), updateUser);
router.patch(
  '/:id/email',
  requireAuth,
  validate(changeEmailSchema),
  changeEmail
);
router.patch('/:id/password', requireAuth, validate(changePasswordSchema), changePassword); 

export default router;