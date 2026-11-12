import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createOrderSchema,
  processChargeSchema,
} from '../schemas/payments.schema.js';
import {
  createOrder,
  createPreference,
  processCharge,
  handleWebhook,
  getPaymentStatus,
  getMyPayments,
} from '../controllers/payments.controller.js';

const router = Router();

// Crear orden de pago en Culqi Checkout v4
router.post('/create-order', requireAuth, validate(createOrderSchema), createOrder);

// Procesar cobro con token de Culqi Checkout v4
router.post('/charge', requireAuth, validate(processChargeSchema), processCharge);

// Alias para compatibilidad con código existente
router.post('/create-preference', requireAuth, validate(createOrderSchema), createPreference);

// Webhook de Culqi (público, Culqi notifica aquí)
router.post('/webhook', handleWebhook);

// Mis pagos (cliente autenticado)
router.get('/me', requireAuth, getMyPayments);

// Obtener estado de un pago por ID
router.get('/:id', requireAuth, getPaymentStatus);

export default router;
