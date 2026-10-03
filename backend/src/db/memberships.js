import { pool } from './index.js';

// "Today" in Peru. The DB runs in UTC, so CURRENT_DATE would flip at 7 pm Lima time.
const TODAY = `(now() AT TIME ZONE 'America/Lima')::date`;

const SELECT = `
  SELECT m.id, m.user_id, m.plan_id, m.start_date, m.end_date, m.status,
         m.created_at, m.updated_at,
         p.name AS plan_name,
         u.first_name, u.last_name, u.dni
  FROM memberships m
  JOIN plans p ON p.id = m.plan_id
  JOIN users u ON u.id = m.user_id`;

// Lazy expiry: flips ACTIVE to EXPIRED once the end date has passed (no cron needed)
export const expireMemberships = async () => {
  await pool.query(
    `UPDATE memberships SET status = 'EXPIRED', updated_at = now()
     WHERE status = 'ACTIVE' AND end_date < ${TODAY}`
  );
};

export const findMembershipById = async (id) => {
  const { rows } = await pool.query(`${SELECT} WHERE m.id = $1`, [id]);
  return rows[0] ?? null;
};

export const findActiveMembership = async (userId) => {
  const { rows } = await pool.query(
    `${SELECT} WHERE m.user_id = $1 AND m.status = 'ACTIVE'`,
    [userId]
  );
  return rows[0] ?? null;
};

export const listMemberships = async ({ userId } = {}) => {
  const { rows } = await pool.query(
    `${SELECT} ${userId ? 'WHERE m.user_id = $1' : ''} ORDER BY m.created_at DESC`,
    userId ? [userId] : []
  );
  return rows;
};

// Starts today and lasts duration_days, counting today (30 days = today + 29)
export const insertMembership = async ({ id, userId, planId, durationDays }) => {
  await pool.query(
    `INSERT INTO memberships (id, user_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, $3, ${TODAY}, ${TODAY} + ($4::int - 1), 'ACTIVE')`,
    [id, userId, planId, durationDays]
  );
  return findMembershipById(id);
};

// Returns false if the membership wasn't ACTIVE (so it can't be cancelled twice)
export const markCancelled = async (id) => {
  const { rowCount } = await pool.query(
    `UPDATE memberships SET status = 'CANCELLED', updated_at = now()
     WHERE id = $1 AND status = 'ACTIVE'`,
    [id]
  );
  return rowCount > 0;
};  