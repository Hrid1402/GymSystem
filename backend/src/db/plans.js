import { pool } from './index.js';

// pg returns NUMERIC as a string, so price is cast to a float
const COLUMNS = `id, name, description, price::float8 AS price,
                 duration_days, is_active, created_at, updated_at`;

const UPDATABLE = ['name', 'description', 'price', 'duration_days', 'is_active'];

export const listPlans = async ({ onlyActive }) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM plans
     ${onlyActive ? 'WHERE is_active = true' : ''}
     ORDER BY price ASC`
  );
  return rows;
};

export const findPlanById = async (id) => {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM plans WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

export const insertPlan = async ({ id, name, description, price, duration_days, is_active }) => {
  const { rows } = await pool.query(
    `INSERT INTO plans (id, name, description, price, duration_days, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [id, name, description ?? null, price, duration_days, is_active ?? true]
  );
  return rows[0];
};

export const updatePlan = async (id, fields) => {
  // Column names come from the whitelist, never from user input
  const keys = Object.keys(fields).filter((k) => UPDATABLE.includes(k));
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `UPDATE plans SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${keys.length + 1}
     RETURNING ${COLUMNS}`,
    [...values, id]
  );
  return rows[0] ?? null;
};

export const deletePlan = async (id) => {
  const { rowCount } = await pool.query('DELETE FROM plans WHERE id = $1', [id]);
  return rowCount > 0;
};