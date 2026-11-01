import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';

const router = Router();

// Protegido exclusivamente para gerentes
router.get('/', requireAuth, requireRole(ROLES.MANAGER), getDashboardData);

export default router;