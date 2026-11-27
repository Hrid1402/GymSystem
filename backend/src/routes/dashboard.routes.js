import { Router } from 'express';
import { getDashboardData, setCapacity } from '../controllers/dashboard.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER), getDashboardData);
router.post('/capacity', requireAuth, requireRole(ROLES.MANAGER), setCapacity);

export default router;