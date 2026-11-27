import { pool } from './index.js';

export const DEFAULT_GYM_SETTINGS = {
  maxCapacity: 50,
  totalRooms: 5,
  openingTime: '06:00',
  closingTime: '22:00',
  isConfigured: false,
  termsAcceptedAt: null,
  configuredBy: null,
};

function formatTimeShort(val, fallback) {
  if (!val) return fallback;
  return String(val).slice(0, 5);
}

function mapSettingsRow(row) {
  if (!row) return { ...DEFAULT_GYM_SETTINGS };
  return {
    maxCapacity: Number(row.max_capacity ?? DEFAULT_GYM_SETTINGS.maxCapacity),
    totalRooms: Number(row.total_rooms ?? DEFAULT_GYM_SETTINGS.totalRooms),
    openingTime: formatTimeShort(row.opening_time, DEFAULT_GYM_SETTINGS.openingTime),
    closingTime: formatTimeShort(row.closing_time, DEFAULT_GYM_SETTINGS.closingTime),
    isConfigured: Boolean(row.is_configured),
    termsAcceptedAt: row.terms_accepted_at || null,
    configuredBy: row.configured_by || null,
    updatedAt: row.updated_at || null,
  };
}

export const getGymSettings = async () => {
  const { rows } = await pool.query(
    `SELECT id, max_capacity, total_rooms, opening_time::text, closing_time::text,
            is_configured, terms_accepted_at, configured_by, updated_at
     FROM gym_settings
     WHERE id = 'default'
     LIMIT 1`
  );
  return mapSettingsRow(rows[0]);
};

export const upsertGymSettings = async ({
  maxCapacity,
  totalRooms,
  openingTime,
  closingTime,
  isConfigured,
  acceptTerms = false,
  configuredBy = null,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO gym_settings (
       id, max_capacity, total_rooms, opening_time, closing_time,
       is_configured, terms_accepted_at, configured_by, updated_at
     )
     VALUES (
       'default', $1, $2, $3::time, $4::time,
       $5, CASE WHEN $6 THEN NOW() ELSE NULL END, $7, NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       max_capacity = EXCLUDED.max_capacity,
       total_rooms = EXCLUDED.total_rooms,
       opening_time = EXCLUDED.opening_time,
       closing_time = EXCLUDED.closing_time,
       is_configured = CASE WHEN $5 THEN true ELSE gym_settings.is_configured END,
       terms_accepted_at = COALESCE(gym_settings.terms_accepted_at, EXCLUDED.terms_accepted_at),
       configured_by = COALESCE(gym_settings.configured_by, EXCLUDED.configured_by),
       updated_at = NOW()
     RETURNING id, max_capacity, total_rooms, opening_time::text, closing_time::text,
               is_configured, terms_accepted_at, configured_by, updated_at`,
    [
      Number(maxCapacity),
      Number(totalRooms),
      `${openingTime}:00`,
      `${closingTime}:00`,
      Boolean(isConfigured),
      Boolean(acceptTerms),
      configuredBy,
    ]
  );

  return mapSettingsRow(rows[0]);
};

export const findClassesViolatingSettings = async ({ totalRooms, openingTime, closingTime }) => {
  const { rows } = await pool.query(
    `SELECT id, nombre_clase, sala, hora_inicio::text, hora_fin::text
     FROM classes
     WHERE estado = 'activa'`,
  );

  const allowedRooms = new Set(
    Array.from({ length: Number(totalRooms) }, (_, i) => `Sala ${i + 1}`)
  );

  return rows.filter((cls) => {
    const start = String(cls.hora_inicio).slice(0, 5);
    const end = String(cls.hora_fin).slice(0, 5);
    const roomInvalid = !allowedRooms.has(cls.sala);
    const timeInvalid = start < openingTime || end > closingTime;
    return roomInvalid || timeInvalid;
  });
};
