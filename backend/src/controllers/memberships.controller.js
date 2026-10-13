import { findUserById } from '../db/users.js';
import { findPlanById } from '../db/plans.js';
import {
  expireMemberships,
  findMembershipById,
  findActiveMembership,
  listMemberships,
  insertMembership,
  markCancelled,
} from '../db/memberships.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';
import { preferenceClient } from '../config/mercadopago.js';
import { createPaymentRecord } from '../db/payments.js';

const ALREADY_ACTIVE = 'Este cliente ya cuenta con una membresía activa. Debe cancelarla antes de inscribirse en otro plan.';

export const enroll = async (req, res) => {
  const isClient = req.user.role === ROLES.CLIENT;
  const { plan_id, user_id } = req.body;

  // Who is being enrolled: clients enroll themselves, staff choose a client
  let targetId;
  if (isClient) {
    if (user_id && user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo puedes inscribirte a ti mismo' });
    }
    targetId = req.user.id;
  } else {
    if (!user_id) return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
    targetId = user_id;
  }

  const target = await findUserById(targetId);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.role !== ROLES.CLIENT || !target.is_active) {
    return res.status(400).json({ error: 'Las membresías son exclusivas para clientes activos' });
  }

  const plan = await findPlanById(plan_id);
  if (!plan || !plan.is_active) return res.status(404).json({ error: 'Plan no encontrado o no disponible' });

  // Staff enroll directly; clients generate Checkout Pro preference to pay first
  if (isClient) {
    const paymentRecordId = newId('PAY');
    const webhookUrl = process.env.MP_WEBHOOK_URL;
    const isPublicWebhook = webhookUrl && !webhookUrl.includes('localhost') && !webhookUrl.includes('127.0.0.1');

    try {
      const preferencePayload = {
        body: {
          items: [
            {
              id: plan.id,
              title: `GymStark - ${plan.name}`,
              description: plan.description || `Membresía por ${plan.duration_days} días`,
              category_id: 'services',
              quantity: 1,
              unit_price: Number(plan.price),
              currency_id: 'PEN',
            },
          ],
          payer: {
            name: req.user.first_name,
            surname: req.user.last_name,
            email: req.user.email,
          },
          statement_descriptor: 'GYMSTARK',
          external_reference: paymentRecordId,
          metadata: {
            payment_record_id: paymentRecordId,
            user_id: targetId,
            plan_id: plan.id,
            plan_duration_days: plan.duration_days,
          },
          ...(process.env.MP_BACK_URL_SUCCESS
            ? {
                back_urls: {
                  success: process.env.MP_BACK_URL_SUCCESS,
                  failure: process.env.MP_BACK_URL_FAILURE || process.env.MP_BACK_URL_SUCCESS,
                  pending: process.env.MP_BACK_URL_PENDING || process.env.MP_BACK_URL_SUCCESS,
                },
              }
            : {}),
          ...(isPublicWebhook ? { notification_url: webhookUrl } : {}),
        },
      };

      const mpPreference = await preferenceClient.create(preferencePayload);

      // Registrar intento de pago
      const payment = await createPaymentRecord({
        id: paymentRecordId,
        userId: targetId,
        planId: plan.id,
        preferenceId: mpPreference.id,
        amount: Number(plan.price),
        currencyId: 'PEN',
        initPoint: mpPreference.init_point,
        sandboxInitPoint: mpPreference.sandbox_init_point,
      });

      // Si el access token empieza con TEST- o estamos en sandbox, preferir sandbox_init_point
      const isSandboxToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith('TEST-');
      const checkoutUrl = (isSandboxToken && mpPreference.sandbox_init_point) 
        ? mpPreference.sandbox_init_point 
        : (mpPreference.init_point || mpPreference.sandbox_init_point);

      return res.status(200).json({
        payment_required: true,
        preference_id: mpPreference.id,
        checkout_url: checkoutUrl,
        init_point: mpPreference.init_point,
        sandbox_init_point: mpPreference.sandbox_init_point,
        payment,
      });
    } catch (mpError) {
      console.error('Error generando Checkout Pro en Mercado Pago:', mpError);
      return res.status(500).json({
        error: 'Error al comunicarse con Mercado Pago para procesar el pago',
        details: mpError.message,
      });
    }
  }

  // Staff (recepcionista o gerente) inscribe directamente en el counter
  try {
    const membership = await insertMembership({
      id: newId('MEM'),
      userId: targetId,
      planId: plan.id,
      durationDays: plan.duration_days,
    });
    return res.status(201).json({ membership });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: ALREADY_ACTIVE });
    throw err;
  }
};

export const getMyMemberships = async (req, res) => {
  await expireMemberships();
  const memberships = await listMemberships({ userId: req.user.id });
  res.json({ memberships });
};

export const getAllMemberships = async (req, res) => {
  await expireMemberships();
  const memberships = await listMemberships({ userId: res.locals.query.user_id });
  res.json({ memberships });
};

export const cancel = async (req, res) => {
  await expireMemberships();

  const membership = await findMembershipById(req.params.id);
  if (!membership) return res.status(404).json({ error: 'Membresía no encontrada' });

  // Clients can only cancel their own; staff can cancel any
  if (req.user.role === ROLES.CLIENT && membership.user_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  if (!(await markCancelled(membership.id))) {
    return res.status(409).json({ error: 'Solo se pueden cancelar membresías que estén activas' });
  }

  res.json({ membership: await findMembershipById(membership.id) });
};