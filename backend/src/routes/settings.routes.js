import { Router } from 'express';
import {
  completeOnboarding,
  fetchSettings,
  saveSettings,
} from '../controllers/settings.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, fetchSettings);
router.post('/onboarding', requireAuth, requireRole(ROLES.MANAGER), completeOnboarding);
router.put('/', requireAuth, requireRole(ROLES.MANAGER), saveSettings);

export default router;
