import { preferenceClient, paymentClient } from '../config/mercadopago.js';
import { findPlanById } from '../db/plans.js';
import { findActiveMembership, insertMembership, expireMemberships } from '../db/memberships.js';
import {
  createPaymentRecord,
  findPaymentById,
  findPaymentByPreferenceId,
  findPaymentByMpPaymentId,
  updatePaymentStatus,
  listPaymentsByUser,
} from '../db/payments.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro)
 * POST /api/payments/create-preference
 */
export const createPreference = async (req, res) => {
  const user = req.user;
  const { plan_id } = req.body;

  // Solo clientes activos pueden comprar membresías
  if (user.role !== ROLES.CLIENT || !user.is_active) {
    return res.status(403).json({ error: 'Solo clientes activos pueden adquirir planes' });
  }

  // Verificar que el plan exista y esté activo
  const plan = await findPlanById(plan_id);
  if (!plan || !plan.is_active) {
    return res.status(404).json({ error: 'Plan no encontrado o no disponible' });
  }

  // Verificar que el usuario no tenga ya una membresía activa
  await expireMemberships();
  const existingActive = await findActiveMembership(user.id);
  if (existingActive) {
    return res.status(409).json({
      error: 'Ya cuentas con una membresía activa. Cancélala antes de inscribirte en otro plan.',
    });
  }

  const paymentRecordId = newId('PAY');

  // Configuración de URLs de retorno y webhook
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const webhookUrl = process.env.MP_WEBHOOK_URL;

  const backUrls = {
    success: process.env.MP_BACK_URL_SUCCESS || `${frontendUrl}/membresias?payment=success`,
    failure: process.env.MP_BACK_URL_FAILURE || `${frontendUrl}/membresias?payment=failure`,
    pending: process.env.MP_BACK_URL_PENDING || `${frontendUrl}/membresias?payment=pending`,
  };

  try {
    const preferencePayload = {
      body: {
        items: [
          {
            id: plan.id,
            title: `GymStark - ${plan.name}`,
            description: plan.description || `Membresía por ${plan.duration_days} días`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: 'PEN',
          },
        ],
        payer: {
          name: user.first_name,
          surname: user.last_name,
          email: user.email,
        },
        back_urls: backUrls,
        auto_return: 'approved',
        external_reference: paymentRecordId,
        metadata: {
          payment_record_id: paymentRecordId,
          user_id: user.id,
          plan_id: plan.id,
          plan_duration_days: plan.duration_days,
        },
        ...(webhookUrl && !webhookUrl.includes('localhost') ? { notification_url: webhookUrl } : {}),
      },
    };

    const mpPreference = await preferenceClient.create(preferencePayload);

    // Guardar registro del intento de pago en la base de datos
    const payment = await createPaymentRecord({
      id: paymentRecordId,
      userId: user.id,
      planId: plan.id,
      preferenceId: mpPreference.id,
      amount: Number(plan.price),
      currencyId: 'PEN',
      initPoint: mpPreference.init_point,
      sandboxInitPoint: mpPreference.sandbox_init_point,
    });

    return res.status(201).json({
      preference_id: mpPreference.id,
      init_point: mpPreference.init_point,
      sandbox_init_point: mpPreference.sandbox_init_point,
      payment,
    });
  } catch (err) {
    console.error('Error al crear preferencia en Mercado Pago:', err);
    return res.status(500).json({
      error: 'Error al comunicarse con Mercado Pago para generar el checkout',
      details: err.message,
    });
  }
};

/**
 * Webhook de notificaciones de Mercado Pago
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req, res) => {
  // Mercado Pago envía notificaciones en dos formatos:
  // 1) Webhooks V2: req.body = { action: 'payment.created', data: { id: '123' }, type: 'payment' }
  // 2) IPN V1: req.query = { topic: 'payment', id: '123' }
  const topic = req.query.topic || req.query.type || req.body?.type || req.body?.action;
  const paymentId =
    req.query['data.id'] ||
    req.query.id ||
    req.body?.data?.id ||
    (typeof req.body?.id === 'string' || typeof req.body?.id === 'number' ? req.body.id : null);

  console.log(`🔔 Notificación recibida de Mercado Pago: topic=${topic}, paymentId=${paymentId}`);

  // Mercado Pago envía eventos de varios tipos (ej: 'payment', 'merchant_order', 'plan', etc.)
  // Para procesar con paymentClient.get({ id }), el evento DEBE ser de tipo 'payment'
  const isPaymentEvent =
    topic === 'payment' ||
    topic === 'payment.created' ||
    topic === 'payment.updated';

  if (!paymentId || !isPaymentEvent) {
    // Si es otro tipo de evento (como merchant_order), respondemos 200 inmediatamente
    return res.status(200).json({ received: true });
  }

  try {
    // Consultar el estado real del pago directamente a la API oficial de Mercado Pago
    const paymentData = await paymentClient.get({ id: String(paymentId) });

    if (!paymentData) {
      console.warn(`⚠️ No se encontró información en Mercado Pago para el pago ${paymentId}`);
      return res.status(200).json({ received: true });
    }

    const mpStatus = paymentData.status; // 'approved', 'rejected', 'pending', etc.
    const externalReference = paymentData.external_reference;
    const metadata = paymentData.metadata || {};
    const paymentRecordId = externalReference || metadata.payment_record_id;

    console.log(`💳 Procesando pago ${paymentId}: status=${mpStatus}, recordId=${paymentRecordId}`);

    let paymentRecord = null;
    if (paymentRecordId) {
      paymentRecord = await findPaymentById(paymentRecordId);
    }
    if (!paymentRecord) {
      paymentRecord = await findPaymentByMpPaymentId(String(paymentData.id));
    }

    if (!paymentRecord) {
      console.warn(`No se encontró registro local para el pago MP ${paymentId}`);
      return res.status(200).json({ received: true });
    }

    let membershipId = paymentRecord.membership_id;

    // Si el pago fue aprobado y aún no tiene membresía creada, activarla
    if (mpStatus === 'approved' && !membershipId) {
      await expireMemberships();

      // Verificar si ya existe una membresía activa para este usuario
      let activeMem = await findActiveMembership(paymentRecord.user_id);
      if (!activeMem) {
        const plan = await findPlanById(paymentRecord.plan_id);
        const durationDays = plan ? plan.duration_days : (metadata.plan_duration_days || 30);

        try {
          const newMem = await insertMembership({
            id: newId('MEM'),
            userId: paymentRecord.user_id,
            planId: paymentRecord.plan_id,
            durationDays,
          });
          membershipId = newMem.id;
          console.log(`✅ ¡Membresía ${newMem.id} creada y activada con éxito para el usuario ${paymentRecord.user_id}!`);
        } catch (insertErr) {
          // Si hubo concurrencia (dos webhooks simultáneos violando one_active_membership_per_user 23505)
          if (insertErr.code === '23505' || insertErr.constraint === 'one_active_membership_per_user') {
            console.warn(`ℹ️ Membresía ya creada por notificación concurrente para ${paymentRecord.user_id}`);
            const existingActive = await findActiveMembership(paymentRecord.user_id);
            membershipId = existingActive?.id || null;
          } else {
            throw insertErr;
          }
        }
      } else {
        membershipId = activeMem.id;
        console.log(`ℹ️ El usuario ya tenía la membresía ${activeMem.id} activa.`);
      }
    }

    // Actualizar registro del pago
    await updatePaymentStatus({
      id: paymentRecord.id,
      mpPaymentId: String(paymentData.id),
      status: mpStatus,
      statusDetail: paymentData.status_detail,
      paymentMethodId: paymentData.payment_method_id,
      paymentTypeId: paymentData.payment_type_id,
      membershipId,
    });

    return res.status(200).json({ received: true, status: mpStatus });
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago:', err);
    // Responder 200 para evitar que Mercado Pago reintente infinitamente si hubo error recuperable
    return res.status(200).json({ received: true, error: err.message });
  }
};

/**
 * Consulta el estado de un pago local
 * GET /api/payments/:id
 */
export const getPaymentStatus = async (req, res) => {
  const { id } = req.params;
  const payment = await findPaymentById(id);

  if (!payment) {
    return res.status(404).json({ error: 'Pago no encontrado' });
  }

  // Clientes solo pueden ver sus propios pagos
  if (req.user.role === ROLES.CLIENT && payment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este pago' });
  }

  return res.json({ payment });
};

/**
 * Lista los pagos del usuario autenticado
 * GET /api/payments/me
 */
export const getMyPayments = async (req, res) => {
  const payments = await listPaymentsByUser(req.user.id);
  return res.json({ payments });
};
