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

// Placeholder until real payments exist
const PAYMENT_COMPLETED = true;

const ALREADY_ACTIVE = 'This client already has an active membership. Cancel it before enrolling in another one.';

export const enroll = async (req, res) => {
  const isClient = req.user.role === ROLES.CLIENT;
  const { plan_id, user_id } = req.body;

  // Who is being enrolled: clients enroll themselves, staff choose a client
  let targetId;
  if (isClient) {
    if (user_id && user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only enroll yourself' });
    }
    targetId = req.user.id;
  } else {
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    targetId = user_id;
  }

  const target = await findUserById(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role !== ROLES.CLIENT || !target.is_active) {
    return res.status(400).json({ error: 'Memberships are only for active clients' });
  }

  const plan = await findPlanById(plan_id);
  if (!plan || !plan.is_active) return res.status(404).json({ error: 'Plan not found' });

  // Staff enroll directly; clients must have paid
  if (isClient && !PAYMENT_COMPLETED) {
    return res.status(402).json({ error: 'Payment not completed' });
  }

  await expireMemberships();
  if (await findActiveMembership(targetId)) {
    return res.status(409).json({ error: ALREADY_ACTIVE });
  }

  try {
    const membership = await insertMembership({
      id: newId('MEM'),
      userId: targetId,
      planId: plan.id,
      durationDays: plan.duration_days,
    });
    res.status(201).json({ membership });
  } catch (err) {
    // The unique index caught two simultaneous enrollments
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
  if (!membership) return res.status(404).json({ error: 'Membership not found' });

  // Clients can only cancel their own; staff can cancel any
  if (req.user.role === ROLES.CLIENT && membership.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }

  if (!(await markCancelled(membership.id))) {
    return res.status(409).json({ error: 'Only active memberships can be cancelled' });
  }

  res.json({ membership: await findMembershipById(membership.id) });
};