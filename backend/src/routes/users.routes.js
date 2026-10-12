import { Router } from 'express';
import { changeEmail, changePassword, createUser, getAllUsers, getUserById, searchUsersForManualAccess, updateUser } from '../controllers/users.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changeEmailSchema, changePasswordSchema, createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), getAllUsers);
router.post('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), validate(createUserSchema), createUser);
router.get('/search', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), searchUsersForManualAccess);
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