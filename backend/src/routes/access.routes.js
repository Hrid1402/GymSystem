import { Router } from 'express';
import {
  confirmAttendance,
  getMyHistory,
  getMyQr,
  getTodayStats,
  identifyFace,
  registerFace,
  validateAccess,
} from '../controllers/access.controller.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { accessHistoryQuerySchema, validateAccessSchema } from '../schemas/access.schema.js';

const router = Router();

// Cliente: obtener token QR efímero para ingresar
router.get('/my-qr', requireAuth, getMyQr);

// Cliente: consultar su propio historial de asistencias
router.get('/my-history', requireAuth, validate(accessHistoryQuerySchema, 'query'), getMyHistory);

// Personal de recepción / Administración: registrar el rostro de un cliente
router.post(
  '/register-face',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  registerFace
);

// Personal de recepción / Administración: identificar cliente por rostro (sin registrar asistencia todavía)
router.post(
  '/identify-face',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  identifyFace
);

// Personal de recepción / Administración: confirmar y registrar formalmente la asistencia
router.post(
  '/confirm-attendance',
  requireAuth,
  requireRole(ROLES.RECEPTIONIST, ROLES.MANAGER),
  confirmAttendance
);

// Personal de recepción / Administración: validar acceso (por QR, DNI o Rostro)
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