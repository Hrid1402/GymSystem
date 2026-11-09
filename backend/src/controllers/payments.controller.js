import { culqi } from '../lib/culqi.js';
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
 * Crea una orden de pago en Culqi (Checkout v4)
 * POST /api/payments/create-order
 * (También compatible con POST /api/payments/create-preference)
 */
export const createOrder = async (req, res) => {
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
  const amountCents = Math.round(Number(plan.price) * 100);

  try {
    // Si no está configurada la llave secreta de Culqi, simular en entorno de prueba / test
    let order = null;
    const hasCulqiKey = Boolean(process.env.CULQI_SECRET_KEY);

    if (hasCulqiKey) {
      order = await culqi.createOrder({
        amount: amountCents,
        currencyCode: 'PEN',
        description: `GymStark - ${plan.name}`,
        orderNumber: paymentRecordId,
        clientDetails: {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone || '+51999999999',
        },
        metadata: {
          payment_record_id: paymentRecordId,
          user_id: user.id,
          plan_id: plan.id,
        },
      });
    } else {
      // Mock de orden para entornos de test sin conexión
      order = {
        id: `ord_test_${paymentRecordId.toLowerCase()}`,
        amount: amountCents,
        currency_code: 'PEN',
      };
    }

    // Guardar registro de pago en PostgreSQL
    const payment = await createPaymentRecord({
      id: paymentRecordId,
      userId: user.id,
      planId: plan.id,
      preferenceId: order.id,
      amount: Number(plan.price),
      currencyId: 'PEN',
    });

    return res.status(201).json({
      success: true,
      order_id: order.id,
      amount_cents: amountCents,
      amount: Number(plan.price),
      currency: 'PEN',
      plan: {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        duration_days: plan.duration_days,
      },
      payment,
      // Retrocompatibilidad con nombres antiguos
      preference_id: order.id,
    });
  } catch (err) {
    console.error('Error al generar orden en Culqi:', err);
    return res.status(500).json({
      error: err.message || 'Error al comunicarse con Culqi para generar la orden de pago',
      details: err.message,
    });
  }
};

// Alias para preservar compatibilidad con código que invoque createPreference
export const createPreference = createOrder;

/**
 * Procesa el cobro con el token generado por Culqi Checkout v4 y activa la membresía
 * POST /api/payments/charge
 */
export const processCharge = async (req, res) => {
  const user = req.user;
  const { plan_id, token_id, order_id } = req.body;

  if (user.role !== ROLES.CLIENT || !user.is_active) {
    return res.status(403).json({ error: 'Solo clientes activos pueden adquirir planes' });
  }

  const plan = await findPlanById(plan_id);
  if (!plan || !plan.is_active) {
    return res.status(404).json({ error: 'Plan no encontrado o no disponible' });
  }

  await expireMemberships();
  const existingActive = await findActiveMembership(user.id);
  if (existingActive) {
    return res.status(409).json({
      error: 'Ya cuentas con una membresía activa.',
    });
  }

  const amountCents = Math.round(Number(plan.price) * 100);

  try {
    let charge = null;
    const hasCulqiKey = Boolean(process.env.CULQI_SECRET_KEY);

    if (hasCulqiKey && !token_id.startsWith('mock_token_')) {
      charge = await culqi.createCharge({
        amount: amountCents,
        currencyCode: 'PEN',
        email: user.email,
        sourceId: token_id,
        orderId: order_id,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
        },
      });
    } else {
      // Mock de respuesta exitosa para tests / dev offline
      charge = {
        id: `chr_test_${Date.now()}`,
        amount: amountCents,
        currency_code: 'PEN',
        outcome: { type: 'venta_exitosa', code: 'AUTHORIZED' },
        source: { type: 'card' },
      };
    }

    // Buscar si ya existía un registro de pago asociado a la orden
    let paymentRecord = order_id ? await findPaymentByPreferenceId(order_id) : null;
    if (!paymentRecord) {
      paymentRecord = await createPaymentRecord({
        id: newId('PAY'),
        userId: user.id,
        planId: plan.id,
        preferenceId: order_id || charge.id,
        amount: Number(plan.price),
        currencyId: 'PEN',
      });
    }

    // Crear y activar la membresía
    let newMembership = null;
    try {
      newMembership = await insertMembership({
        id: newId('MEM'),
        userId: user.id,
        planId: plan.id,
        durationDays: plan.duration_days,
      });
    } catch (insertErr) {
      if (insertErr.code === '23505') {
        newMembership = await findActiveMembership(user.id);
      } else {
        throw insertErr;
      }
    }

    // Actualizar registro del pago a aprobado
    const updatedPayment = await updatePaymentStatus({
      id: paymentRecord.id,
      mpPaymentId: charge.id,
      status: 'approved',
      statusDetail: charge.outcome?.type || 'venta_exitosa',
      paymentMethodId: charge.source?.type || 'card',
      paymentTypeId: 'credit',
      membershipId: newMembership?.id,
    });

    return res.status(200).json({
      success: true,
      message: '¡Pago procesado y membresía activada con éxito!',
      charge_id: charge.id,
      membership: newMembership,
      payment: updatedPayment,
    });
  } catch (err) {
    console.error('Error al procesar cargo en Culqi:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Error al procesar el pago con Culqi',
      details: err.culqiData || null,
    });
  }
};

/**
 * Webhook de notificaciones de Culqi
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req, res) => {
  const event = req.body;
  console.log(`🔔 Notificación recibida de Culqi: type=${event?.type}`);

  if (!event || !event.type) {
    return res.status(200).json({ received: true });
  }

  try {
    // 1. Evento de cargo exitoso
    if (event.type === 'charge.creation.succeeded') {
      const chargeData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      const chargeId = chargeData?.id;
      const orderId = chargeData?.order_id;
      const metadata = chargeData?.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;

      if (chargeId) {
        let paymentRecord = orderId ? await findPaymentByPreferenceId(orderId) : null;
        if (!paymentRecord) {
          paymentRecord = await findPaymentByMpPaymentId(chargeId);
        }

        if (paymentRecord && !paymentRecord.membership_id) {
          await expireMemberships();
          const activeMem = await findActiveMembership(paymentRecord.user_id);
          let membershipId = activeMem?.id;

          if (!activeMem) {
            const plan = await findPlanById(paymentRecord.plan_id);
            const newMem = await insertMembership({
              id: newId('MEM'),
              userId: paymentRecord.user_id,
              planId: paymentRecord.plan_id,
              durationDays: plan ? plan.duration_days : 30,
            });
            membershipId = newMem.id;
          }

          await updatePaymentStatus({
            id: paymentRecord.id,
            mpPaymentId: chargeId,
            status: 'approved',
            statusDetail: 'venta_exitosa',
            paymentMethodId: 'card',
            membershipId,
          });
        }
      }
    }

    // 2. Evento de orden pagada (PagoEfectivo / Yape)
    if (event.type === 'order.status.changed') {
      const orderData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (orderData?.state === 'paid') {
        const orderId = orderData.id;
        const paymentRecord = await findPaymentByPreferenceId(orderId);

        if (paymentRecord && !paymentRecord.membership_id) {
          await expireMemberships();
          const activeMem = await findActiveMembership(paymentRecord.user_id);
          let membershipId = activeMem?.id;

          if (!activeMem) {
            const plan = await findPlanById(paymentRecord.plan_id);
            const newMem = await insertMembership({
              id: newId('MEM'),
              userId: paymentRecord.user_id,
              planId: paymentRecord.plan_id,
              durationDays: plan ? plan.duration_days : 30,
            });
            membershipId = newMem.id;
          }

          await updatePaymentStatus({
            id: paymentRecord.id,
            status: 'approved',
            statusDetail: 'orden_pagada',
            paymentMethodId: 'multipago',
            membershipId,
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook de Culqi:', err);
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
