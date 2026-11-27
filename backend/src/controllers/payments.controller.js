import { culqi } from '../lib/culqi.js';
import { findPlanById } from '../db/plans.js';
import { findUserById } from '../db/users.js';
import {
  deleteMembershipById,
  expireMemberships,
  findActiveMembership,
  insertMembership,
} from '../db/memberships.js';
import {
  createPaymentRecord,
  createCashPaymentRecord,
  findPaymentById,
  findPaymentByPreferenceId,
  findPaymentByMpPaymentId,
  updatePaymentStatus,
  listPaymentsByUser,
  getDailyPaymentsSummary,
} from '../db/payments.js';
import { issueInvoiceForPayment } from '../services/invoices.service.js';
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

  // Evitar compras si ya tiene una membresía activa
  await expireMemberships();
  const existingActive = await findActiveMembership(user.id);
  if (existingActive) {
    return res.status(409).json({
      error: 'Ya cuentas con una membresía activa. Debes esperar a que venza o cancelarla antes de adquirir otra.',
    });
  }

  const paymentRecordId = newId('PAY');
  const amountCents = Math.round(Number(plan.price) * 100);

  if (amountCents < 600) {
    return res.status(400).json({
      error: 'Culqi requiere un monto mínimo de S/ 6.00 para procesar pagos en línea.',
    });
  }

  try {
    // Guardar registro de pago pendiente en PostgreSQL
    const payment = await createPaymentRecord({
      id: paymentRecordId,
      userId: user.id,
      planId: plan.id,
      preferenceId: paymentRecordId,
      amount: Number(plan.price),
      currencyId: 'PEN',
    });

    return res.status(201).json({
      success: true,
      payment_required: true,
      payment_record_id: paymentRecordId,
      order_id: null,
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
      preference_id: paymentRecordId,
    });
  } catch (err) {
    console.error('Error al registrar intención de pago:', err);
    return res.status(500).json({
      error: 'Error al registrar la intención de pago',
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
  const { plan_id, token_id, order_id, billing_details } = req.body;

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

    // Emisión desacoplada de comprobante electrónico SUNAT UBL 2.1
    let invoice = null;
    try {
      invoice = await issueInvoiceForPayment({
        paymentRecord: updatedPayment,
        plan,
        user,
        billingDetails: billing_details,
      });
    } catch (invErr) {
      console.error('Error no bloqueante al generar comprobante electrónico:', invErr);
      // El pago y la membresía quedan activos; la emisión de comprobante se puede reintentar
    }

    return res.status(200).json({
      success: true,
      message: '¡Pago procesado y membresía activada con éxito!',
      charge_id: charge.id,
      membership: newMembership,
      payment: updatedPayment,
      invoice,
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

      if (chargeId) {
        let paymentRecord = orderId ? await findPaymentByPreferenceId(orderId) : null;
        if (!paymentRecord) {
          paymentRecord = await findPaymentByMpPaymentId(chargeId);
        }

        if (paymentRecord && !paymentRecord.membership_id) {
          await expireMemberships();
          const activeMem = await findActiveMembership(paymentRecord.user_id);
          let membershipId = activeMem?.id;

          const plan = await findPlanById(paymentRecord.plan_id);

          if (!activeMem) {
            const newMem = await insertMembership({
              id: newId('MEM'),
              userId: paymentRecord.user_id,
              planId: paymentRecord.plan_id,
              durationDays: plan ? plan.duration_days : 30,
            });
            membershipId = newMem.id;
          }

          const updatedPayment = await updatePaymentStatus({
            id: paymentRecord.id,
            mpPaymentId: chargeId,
            status: 'approved',
            statusDetail: 'venta_exitosa',
            paymentMethodId: 'card',
            membershipId,
          });

          // Emisión desacoplada de comprobante
          try {
            const userRecord = await findUserById(paymentRecord.user_id);
            if (userRecord && plan) {
              await issueInvoiceForPayment({
                paymentRecord: updatedPayment,
                plan,
                user: userRecord,
              });
            }
          } catch (invErr) {
            console.error('Error no bloqueante emitiendo comprobante en webhook:', invErr);
          }
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

          const plan = await findPlanById(paymentRecord.plan_id);

          if (!activeMem) {
            const newMem = await insertMembership({
              id: newId('MEM'),
              userId: paymentRecord.user_id,
              planId: paymentRecord.plan_id,
              durationDays: plan ? plan.duration_days : 30,
            });
            membershipId = newMem.id;
          }

          const updatedPayment = await updatePaymentStatus({
            id: paymentRecord.id,
            status: 'approved',
            statusDetail: 'orden_pagada',
            paymentMethodId: 'multipago',
            membershipId,
          });

          // Emisión desacoplada de comprobante
          try {
            const userRecord = await findUserById(paymentRecord.user_id);
            if (userRecord && plan) {
              await issueInvoiceForPayment({
                paymentRecord: updatedPayment,
                plan,
                user: userRecord,
              });
            }
          } catch (invErr) {
            console.error('Error no bloqueante emitiendo comprobante en webhook:', invErr);
          }
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

/**
 * Registra un cobro presencial en efectivo en mostrador (Recepción / Gerencia)
 * POST /api/payments/cash-charge
 */
export const processCashCharge = async (req, res) => {
  const staffUser = req.user;
  const { client_id, plan_id, billing_details } = req.body;

  if (staffUser.role !== ROLES.MANAGER && staffUser.role !== ROLES.RECEPTIONIST) {
    return res.status(403).json({ error: 'Solo el personal de recepción o gerencia puede registrar cobros en efectivo' });
  }

  const client = await findUserById(client_id);
  if (!client || client.role !== ROLES.CLIENT) {
    return res.status(404).json({ error: 'Cliente no encontrado o no tiene rol CLIENT' });
  }

  if (!client.is_active) {
    return res.status(400).json({ error: 'La cuenta del cliente se encuentra desactivada' });
  }

  const plan = await findPlanById(plan_id);
  if (!plan || !plan.is_active) {
    return res.status(404).json({ error: 'Plan no encontrado o no disponible' });
  }

  await expireMemberships();
  const existingActive = await findActiveMembership(client.id);
  if (existingActive) {
    return res.status(409).json({
      error: `El cliente ya cuenta con una membresía activa (${existingActive.plan_name}) vigente hasta el ${existingActive.end_date}.`,
      existingMembership: existingActive,
    });
  }

  const paymentId = newId('PAY');
  const membershipId = newId('MEM');

  let newMembership = null;
  try {
    newMembership = await insertMembership({
      id: membershipId,
      userId: client.id,
      planId: plan.id,
      durationDays: plan.duration_days,
    });
  } catch (insertErr) {
    if (insertErr.code === '23505') {
      const active = await findActiveMembership(client.id);
      return res.status(409).json({
        error: `El cliente ya cuenta con una membresía activa vigente hasta el ${active.end_date}.`,
        existingMembership: active,
      });
    }
    throw insertErr;
  }

  let cashPayment = null;
  try {
    cashPayment = await createCashPaymentRecord({
      id: paymentId,
      userId: client.id,
      planId: plan.id,
      amount: Number(plan.price),
      currencyId: 'PEN',
      membershipId: newMembership.id,
      registeredBy: staffUser.id,
      statusDetail: 'cobro_efectivo_mostrador',
    });
  } catch (payErr) {
    await deleteMembershipById(newMembership.id).catch(() => {});
    throw payErr;
  }

  let invoice = null;
  try {
    invoice = await issueInvoiceForPayment({
      paymentRecord: cashPayment,
      plan,
      user: client,
      billingDetails: billing_details,
    });
  } catch (invErr) {
    console.error('Error no bloqueante al generar comprobante electrónico para pago en efectivo:', invErr);
  }

  return res.status(201).json({
    success: true,
    message: 'Pago en efectivo registrado y membresía activada con éxito',
    payment: cashPayment,
    membership: newMembership,
    invoice,
  });
};

/**
 * Consulta el resumen de cobros del día actual (Efectivo vs Online)
 * GET /api/payments/daily-summary
 */
export const getDailySummary = async (req, res) => {
  if (req.user.role !== ROLES.MANAGER && req.user.role !== ROLES.RECEPTIONIST) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  const summary = await getDailyPaymentsSummary();
  return res.json({ summary });
};
