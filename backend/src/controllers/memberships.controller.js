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
import { culqi } from '../lib/culqi.js';
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

  // Staff inscribe directamente en counter; clientes generan Orden de Culqi para pagar en modal
  if (isClient) {
    const paymentRecordId = newId('PAY');
    const amountCents = Math.round(Number(plan.price) * 100);

    try {
      let order = null;
      const hasCulqiKey = Boolean(process.env.CULQI_SECRET_KEY);

      if (hasCulqiKey) {
        order = await culqi.createOrder({
          amount: amountCents,
          currencyCode: 'PEN',
          description: `GymStark - ${plan.name}`,
          orderNumber: paymentRecordId,
          clientDetails: {
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            email: req.user.email,
            phone: req.user.phone || '+51999999999',
          },
          metadata: {
            payment_record_id: paymentRecordId,
            user_id: targetId,
            plan_id: plan.id,
          },
        });
      } else {
        order = {
          id: `ord_test_${paymentRecordId.toLowerCase()}`,
          amount: amountCents,
          currency_code: 'PEN',
        };
      }

      // Registrar intento de pago
      const payment = await createPaymentRecord({
        id: paymentRecordId,
        userId: targetId,
        planId: plan.id,
        preferenceId: order.id,
        amount: Number(plan.price),
        currencyId: 'PEN',
      });

      return res.status(200).json({
        payment_required: true,
        gateway: 'culqi',
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
      });
    } catch (culqiError) {
      console.error('Error generando orden en Culqi:', culqiError);
      return res.status(500).json({
        error: culqiError.message || 'Error al comunicarse con Culqi para procesar el pago',
        details: culqiError.message,
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
  const userId = res.locals.query?.user_id || req.query?.user_id;
  const memberships = await listMemberships({ userId });
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
