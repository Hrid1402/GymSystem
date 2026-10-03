import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createMembershipSchema, listMembershipsQuerySchema } from '../schemas/membership.schema.js';
import { enroll, getMyMemberships, getAllMemberships, cancel } from '../controllers/memberships.controller.js';

const router = Router();

router.get('/me', requireAuth, getMyMemberships);
router.get(
  '/',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  validate(listMembershipsQuerySchema, 'query'),
  getAllMemberships
);
router.post('/', requireAuth, validate(createMembershipSchema), enroll);
router.patch('/:id/cancel', requireAuth, cancel);

export default router;