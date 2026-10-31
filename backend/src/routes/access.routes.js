import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateAccessSchema, accessHistoryQuerySchema } from '../schemas/access.schema.js';
import {
  getMyQr,
  validateAccess,
  getMyHistory,
  getTodayStats,
} from '../controllers/access.controller.js';

const router = Router();

// Cliente: obtener token QR efímero para ingresar
router.get('/my-qr', requireAuth, getMyQr);

// Cliente: consultar su propio historial de asistencias
router.get('/my-history', requireAuth, validate(accessHistoryQuerySchema, 'query'), getMyHistory);

// Personal de recepción / Administración: validar acceso (por QR o DNI)
router.post(
  '/validate',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  validate(validateAccessSchema, 'body'),
  validateAccess
);

// Personal de recepción / Administración: métricas de afluencia de hoy
router.get(
  '/today-stats',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  getTodayStats
);

export default router;
