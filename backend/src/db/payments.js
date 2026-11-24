import { pool } from './index.js';

const SELECT = `
  SELECT p.id, p.user_id, p.plan_id, p.preference_id, p.mp_payment_id,
         p.status, p.status_detail, p.amount, p.currency_id,
         p.payment_method_id, p.payment_type_id, p.membership_id, p.registered_by,
         p.init_point, p.sandbox_init_point, p.created_at, p.updated_at,
         pl.name AS plan_name,
         u.first_name, u.last_name, u.email, u.tipo_documento, u.numero_documento,
         rb.first_name AS registered_by_name, rb.last_name AS registered_by_last_name
  FROM payments p
  JOIN plans pl ON pl.id = p.plan_id
  JOIN users u ON u.id = p.user_id
  LEFT JOIN users rb ON rb.id = p.registered_by
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

export const createCashPaymentRecord = async ({
  id,
  userId,
  planId,
  amount,
  currencyId = 'PEN',
  membershipId,
  registeredBy,
  statusDetail = 'cobro_efectivo_mostrador',
}) => {
  const query = `
    INSERT INTO payments (
      id, user_id, plan_id, preference_id, mp_payment_id,
      status, status_detail, amount, currency_id,
      payment_method_id, payment_type_id, membership_id, registered_by
    )
    VALUES ($1, $2, $3, $1, $1, 'approved', $4, $5, $6, 'EFECTIVO', 'cash', $7, $8)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    id,
    userId,
    planId,
    statusDetail,
    amount,
    currencyId,
    membershipId,
    registeredBy,
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

export const getDailyPaymentsSummary = async () => {
  const { rows } = await pool.query(`
    SELECT
      (now() AT TIME ZONE 'America/Lima')::date::text AS date,
      COALESCE(SUM(CASE WHEN payment_method_id = 'EFECTIVO' AND status = 'approved' THEN amount ELSE 0 END), 0)::float8 AS cash_total,
      COUNT(CASE WHEN payment_method_id = 'EFECTIVO' AND status = 'approved' THEN 1 END)::int AS cash_count,
      COALESCE(SUM(CASE WHEN payment_method_id != 'EFECTIVO' AND status = 'approved' THEN amount ELSE 0 END), 0)::float8 AS online_total,
      COUNT(CASE WHEN payment_method_id != 'EFECTIVO' AND status = 'approved' THEN 1 END)::int AS online_count,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)::float8 AS total_revenue
    FROM payments
    WHERE (created_at AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date
  `);
  return rows[0];
};
