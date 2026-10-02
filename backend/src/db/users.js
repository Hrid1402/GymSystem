import { pool } from './index.js';

export const findUserBySupabaseId = async (supabaseUserId) => {
  const { rows } = await pool.query(
    `SELECT id, email, first_name, last_name, dni, phone, date_of_birth, role, is_active
     FROM users WHERE supabase_user_id = $1`,
    [supabaseUserId]
  );
  return rows[0] ?? null;
};

export const findUserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, email, first_name, last_name, dni, phone, date_of_birth, role, is_active
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const insertUser = async ({ id, supabaseUserId, email, firstName, lastName, dni, phone, dateOfBirth, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (id, supabase_user_id, email, first_name, last_name, dni, phone, date_of_birth, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, email, first_name, last_name, dni, phone, date_of_birth, role, is_active`,
    [id, supabaseUserId, email, firstName, lastName, dni, phone ?? null, dateOfBirth ?? null, role]
  );
  return rows[0];
};