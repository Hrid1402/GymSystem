import { pool } from './index.js';

export const upsertTrainerProfile = async (userId, specialty) => {
  const { rows } = await pool.query(
    `INSERT INTO trainer_profiles (user_id, specialty)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET specialty = EXCLUDED.specialty, updated_at = now()
     RETURNING user_id, specialty, created_at, updated_at`,
    [userId, specialty.trim()]
  );
  return rows[0];
};

export const listTrainersWithProfile = async () => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.tipo_documento,
            u.numero_documento, u.phone, u.date_of_birth, u.role,
            u.is_active, u.created_at, u.updated_at,
            tp.specialty
     FROM users u
     LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
     WHERE u.role = 'TRAINER'
     ORDER BY u.created_at DESC`
  );
  return rows;
};