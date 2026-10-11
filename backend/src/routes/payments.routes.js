import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createPreferenceSchema } from '../schemas/payments.schema.js';
import {
  createPreference,
  handleWebhook,
  getPaymentStatus,
  getMyPayments,
} from '../controllers/payments.controller.js';

const router = Router();

// Webhook de Mercado Pago (público, MP notifica aquí)
router.post('/webhook', handleWebhook);

// Mis pagos (cliente autenticado)
router.get('/me', requireAuth, getMyPayments);

// Obtener estado de un pago por ID
router.get('/:id', requireAuth, getPaymentStatus);

export default router;
