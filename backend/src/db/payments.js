import { pool } from './index.js';

const SELECT = `
  SELECT p.id, p.user_id, p.plan_id, p.preference_id, p.mp_payment_id,
         p.status, p.status_detail, p.amount, p.currency_id,
         p.payment_method_id, p.payment_type_id, p.membership_id,
         p.init_point, p.sandbox_init_point, p.created_at, p.updated_at,
         pl.name AS plan_name,
         u.first_name, u.last_name, u.email, u.dni
  FROM payments p
  JOIN plans pl ON pl.id = p.plan_id
  JOIN users u ON u.id = p.user_id
`;

export const createPaymentRecord = async ({
  id,
  userId,
  planId,
  preferenceId,
  amount,
  currencyId = 'PEN',
  initPoint,
  sandboxInitPoint,
}) => {
  const query = `
    INSERT INTO payments (
      id, user_id, plan_id, preference_id, status, amount,
      currency_id, init_point, sandbox_init_point
    )
    VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    id,
    userId,
    planId,
    preferenceId,
    amount,
    currencyId,
    initPoint,
    sandboxInitPoint,
  ]);
  return rows[0];
};

export const findPaymentById = async (id) => {
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
};

export const findPaymentByPreferenceId = async (preferenceId) => {
  const { rows } = await pool.query(`${SELECT} WHERE p.preference_id = $1`, [preferenceId]);
  return rows[0] ?? null;
};

export const findPaymentByMpPaymentId = async (mpPaymentId) => {
  const { rows } = await pool.query(`${SELECT} WHERE p.mp_payment_id = $1`, [mpPaymentId]);
  return rows[0] ?? null;
};

export const listPaymentsByUser = async (userId) => {
  const { rows } = await pool.query(
    `${SELECT} WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
};

export const updatePaymentStatus = async ({
  id,
  mpPaymentId,
  status,
  statusDetail,
  paymentMethodId,
  paymentTypeId,
  membershipId,
}) => {
  const query = `
    UPDATE payments
    SET mp_payment_id = COALESCE($2, mp_payment_id),
        status = $3,
        status_detail = COALESCE($4, status_detail),
        payment_method_id = COALESCE($5, payment_method_id),
        payment_type_id = COALESCE($6, payment_type_id),
        membership_id = COALESCE($7, membership_id),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    id,
    mpPaymentId,
    status,
    statusDetail,
    paymentMethodId,
    paymentTypeId,
    membershipId,
  ]);
  return rows[0] ?? null;
};
