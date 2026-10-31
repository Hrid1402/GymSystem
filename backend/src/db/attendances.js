import { pool } from './index.js';

// Fecha local en Lima (UTC-5) para evitar desfases a partir de las 7:00 PM
const TODAY_LIMA = `(now() AT TIME ZONE 'America/Lima')::date`;

const ATTENDANCE_COLUMNS = `
  a.id, a.user_id, a.membership_id, a.entry_method, a.registered_by, a.created_at,
  u.first_name, u.last_name, u.dni,
  p.name AS plan_name,
  rb.first_name AS registered_by_name
`;

const BASE_QUERY = `
  SELECT ${ATTENDANCE_COLUMNS}
  FROM attendances a
  JOIN users u ON u.id = a.user_id
  LEFT JOIN memberships m ON m.id = a.membership_id
  LEFT JOIN plans p ON p.id = m.plan_id
  LEFT JOIN users rb ON rb.id = a.registered_by
`;

export const insertAttendance = async ({ id, userId, membershipId, registeredBy, entryMethod = 'qr' }) => {
  await pool.query(
    `INSERT INTO attendances (id, user_id, membership_id, registered_by, entry_method)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, membershipId ?? null, registeredBy ?? null, entryMethod]
  );
  return findAttendanceById(id);
};

export const findAttendanceById = async (id) => {
  const { rows } = await pool.query(`${BASE_QUERY} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
};

// Comprobar si el usuario ya registró ingreso hoy (en zona horaria de Lima)
export const getTodayAttendanceByUser = async (userId) => {
  const { rows } = await pool.query(
    `${BASE_QUERY}
     WHERE a.user_id = $1 AND (a.created_at AT TIME ZONE 'America/Lima')::date = ${TODAY_LIMA}
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
};

// Historial de asistencias de un cliente
export const listAttendancesByUser = async (userId, { limit = 50, offset = 0 } = {}) => {
  const { rows } = await pool.query(
    `${BASE_QUERY}
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
};

// Métricas de afluencia del día de hoy
export const getTodayAttendanceStats = async () => {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*)::int AS total_visits,
      COUNT(DISTINCT a.user_id)::int AS unique_clients
    FROM attendances a
    WHERE (a.created_at AT TIME ZONE 'America/Lima')::date = ${TODAY_LIMA}
  `);
  return rows[0] ?? { total_visits: 0, unique_clients: 0 };
};
