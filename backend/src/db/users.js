import { pool } from './index.js';


const USER_COLUMNS = `id, email, first_name, last_name, dni, phone,
                      date_of_birth, role, is_active, created_at, updated_at`;

const UPDATABLE = ['first_name', 'last_name', 'phone', 'date_of_birth', 'dni', 'role', 'is_active'];

export const findUserBySupabaseId = async (supabaseUserId) => {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE supabase_user_id = $1`,
    [supabaseUserId]
  );
  return rows[0] ?? null;
};

export const findUserById = async (id) => {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

// Internal use only, never return this value in a response
export const findSupabaseIdByUserId = async (id) => {
  const { rows } = await pool.query('SELECT supabase_user_id FROM users WHERE id = $1', [id]);
  return rows[0]?.supabase_user_id ?? null;
};

export const listUsers = async ({ onlyClients }) => {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS} FROM users
     ${onlyClients ? "WHERE role = 'CLIENT'" : ''}
     ORDER BY created_at DESC`
  );
  return rows;
};

export const insertUser = async ({
  id, supabaseUserId, email, firstName, lastName, dni, phone, dateOfBirth, role,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO users (id, supabase_user_id, email, first_name, last_name, dni, phone, date_of_birth, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${USER_COLUMNS}`,
    [id, supabaseUserId, email, firstName, lastName, dni, phone ?? null, dateOfBirth ?? null, role]
  );
  return rows[0];
};

export const updateUserFields = async (id, fields) => {
  // Column names come from the whitelist, never from user input
  const keys = Object.keys(fields).filter((k) => UPDATABLE.includes(k));
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${keys.length + 1}
     RETURNING ${USER_COLUMNS}`,
    [...values, id]
  );
  return rows[0] ?? null;
};

export const updateUserEmail = async (id, email) => {
  const { rows } = await pool.query(
    `UPDATE users SET email = $1, updated_at = now()
     WHERE id = $2
     RETURNING ${USER_COLUMNS}`,
    [email, id]
  );
  return rows[0] ?? null;
};