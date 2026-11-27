import { pool } from './index.js';

const LIMA_NOW = `(now() AT TIME ZONE 'America/Lima')`;
const LIMA_TODAY = `${LIMA_NOW}::date`;

// Calcula la próxima fecha real (YYYY-MM-DD) de la clase en zona horaria Lima
const PROXIMA_FECHA_SQL = `
  (
    ${LIMA_TODAY} +
    CASE
      WHEN ((c.dia_semana - EXTRACT(DOW FROM ${LIMA_NOW})::int + 7) % 7) = 0
       AND c.hora_fin <= ${LIMA_NOW}::time
      THEN 7
      ELSE ((c.dia_semana - EXTRACT(DOW FROM ${LIMA_NOW})::int + 7) % 7)
    END
  )::date
`;

export const findClassById = async (id, userId = null) => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.catalog_id,
        COALESCE(cc.nombre, c.nombre_clase) AS nombre_clase,
        COALESCE(cc.categoria, c.categoria) AS categoria,
        c.descripcion,
        c.entrenador_id,
        u.first_name AS entrenador_nombre,
        u.last_name AS entrenador_apellido,
        c.sala,
        c.dia_semana,
        c.hora_inicio,
        c.hora_fin,
        c.cupo_maximo,
        c.estado,
        c.creado_en,
        c.actualizado_en,
        (${PROXIMA_FECHA_SQL})::text AS proxima_fecha,
        COALESCE((
          SELECT COUNT(*)::int
          FROM class_enrollments ce
          WHERE ce.class_id = c.id
            AND ce.fecha_sesion = (${PROXIMA_FECHA_SQL})
        ), 0) AS inscritos_actuales,
        CASE
          WHEN $2::varchar IS NULL THEN false
          ELSE EXISTS (
            SELECT 1
            FROM class_enrollments ce
            WHERE ce.class_id = c.id
              AND ce.client_id = $2
              AND ce.fecha_sesion = (${PROXIMA_FECHA_SQL})
          )
        END AS ya_inscrito
      FROM classes c
      JOIN users u ON u.id = c.entrenador_id
      LEFT JOIN class_catalog cc ON cc.id = c.catalog_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [id, userId]
  );
  return rows[0] || null;
};

/**
 * Busca choques en el mismo dia_semana para el mismo entrenador o la misma sala.
 * Dos rangos [h1_inicio, h1_fin) y [h2_inicio, h2_fin) se superponen si h1_inicio < h2_fin AND h1_fin > h2_inicio.
 */
export const findScheduleConflicts = async ({
  entrenadorId,
  sala,
  diaSemana,
  horaInicio,
  horaFin,
  excludeClassId = null,
}) => {
  const params = [entrenadorId, sala, Number(diaSemana), horaInicio, horaFin];
  let excludeClause = '';

  if (excludeClassId) {
    params.push(excludeClassId);
    excludeClause = ` AND c.id <> $${params.length}`;
  }

  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.nombre_clase,
        c.entrenador_id,
        c.sala,
        c.dia_semana,
        c.hora_inicio,
        c.hora_fin
      FROM classes c
      WHERE c.estado = 'activa'
        AND c.dia_semana = $3::smallint
        AND ($4::time < c.hora_fin AND $5::time > c.hora_inicio)
        AND (c.entrenador_id = $1 OR c.sala = $2)
        ${excludeClause}
    `,
    params
  );

  return rows;
};

export const insertClass = async ({
  id,
  catalogId = null,
  nombreClase,
  categoria = 'basica',
  descripcion = null,
  entrenadorId,
  sala,
  diaSemana,
  horaInicio,
  horaFin,
  cupoMaximo,
  estado = 'activa',
}) => {
  await pool.query(
    `
      INSERT INTO classes (
        id, catalog_id, nombre_clase, categoria, descripcion, entrenador_id, sala, dia_semana,
        hora_inicio, hora_fin, cupo_maximo, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::smallint, $9::time, $10::time, $11, $12)
    `,
    [
      id,
      catalogId,
      nombreClase,
      categoria,
      descripcion,
      entrenadorId,
      sala,
      Number(diaSemana),
      horaInicio,
      horaFin,
      cupoMaximo,
      estado,
    ]
  );
  return findClassById(id);
};

export const updateClassById = async (id, fields) => {
  const { rowCount } = await pool.query(
    `
      UPDATE classes
      SET
        catalog_id = $2,
        nombre_clase = $3,
        categoria = $4,
        descripcion = $5,
        entrenador_id = $6,
        sala = $7,
        dia_semana = $8::smallint,
        hora_inicio = $9::time,
        hora_fin = $10::time,
        cupo_maximo = $11,
        estado = $12,
        actualizado_en = NOW()
      WHERE id = $1
    `,
    [
      id,
      fields.catalogId ?? null,
      fields.nombreClase,
      fields.categoria || 'basica',
      fields.descripcion ?? null,
      fields.entrenadorId,
      fields.sala,
      Number(fields.diaSemana),
      fields.horaInicio,
      fields.horaFin,
      fields.cupoMaximo,
      fields.estado,
    ]
  );
  if (rowCount === 0) return null;
  return findClassById(id);
};

export const countFutureEnrollments = async (classId) => {
  const { rows } = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM class_enrollments
      WHERE class_id = $1
        AND fecha_sesion >= ${LIMA_TODAY}
    `,
    [classId]
  );
  return rows[0]?.total || 0;
};

export const deleteClassByIdIfEmpty = async (id) => {
  const { rows } = await pool.query(
    `
      DELETE FROM classes c
      WHERE c.id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM class_enrollments ce
          WHERE ce.class_id = c.id
            AND ce.fecha_sesion >= ${LIMA_TODAY}
        )
      RETURNING id
    `,
    [id]
  );
  return rows[0] || null;
};

export const listClassesForUser = async (userId) => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.catalog_id,
        COALESCE(cc.nombre, c.nombre_clase) AS nombre_clase,
        COALESCE(cc.categoria, c.categoria) AS categoria,
        c.descripcion,
        c.entrenador_id,
        u.first_name AS entrenador_nombre,
        u.last_name AS entrenador_apellido,
        c.sala,
        c.dia_semana,
        c.hora_inicio,
        c.hora_fin,
        c.cupo_maximo,
        c.estado,
        c.creado_en,
        c.actualizado_en,
        (${PROXIMA_FECHA_SQL})::text AS proxima_fecha,
        COALESCE((
          SELECT COUNT(*)::int
          FROM class_enrollments ce
          WHERE ce.class_id = c.id
            AND ce.fecha_sesion = (${PROXIMA_FECHA_SQL})
        ), 0) AS inscritos_actuales,
        EXISTS (
          SELECT 1
          FROM class_enrollments ce
          WHERE ce.class_id = c.id
            AND ce.client_id = $1
            AND ce.fecha_sesion = (${PROXIMA_FECHA_SQL})
        ) AS ya_inscrito
      FROM classes c
      JOIN users u ON u.id = c.entrenador_id
      LEFT JOIN class_catalog cc ON cc.id = c.catalog_id
      ORDER BY
        CASE WHEN c.dia_semana = 0 THEN 7 ELSE c.dia_semana END ASC,
        c.hora_inicio ASC,
        c.creado_en DESC
    `,
    [userId]
  );
  return rows;
};

export const enrollClientInClass = async ({ enrollmentId, classId, clientId, fechaSesion = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: classRows } = await client.query(
      `
        SELECT
          c.id,
          c.dia_semana,
          c.cupo_maximo,
          c.estado,
          (${PROXIMA_FECHA_SQL})::text AS proxima_fecha
        FROM classes c
        WHERE c.id = $1
        FOR UPDATE
      `,
      [classId]
    );

    const cls = classRows[0];
    if (!cls) {
      await client.query('ROLLBACK');
      return { status: 'NOT_FOUND' };
    }

    if (cls.estado !== 'activa') {
      await client.query('ROLLBACK');
      return { status: 'CLOSED' };
    }

    const sessionDate = fechaSesion || cls.proxima_fecha;

    // Validar que la fecha corresponda al dia_semana de la clase y no sea pasada ni mayor a 14 días
    const { rows: dateCheck } = await client.query(
      `
        SELECT
          EXTRACT(DOW FROM $1::date)::int AS dow,
          ($1::date >= ${LIMA_TODAY}) AS not_past,
          ($1::date <= ${LIMA_TODAY} + INTERVAL '14 days') AS within_window
      `,
      [sessionDate]
    );

    const chk = dateCheck[0];
    if (!chk || chk.dow !== cls.dia_semana || !chk.not_past || !chk.within_window) {
      await client.query('ROLLBACK');
      return { status: 'INVALID_DATE' };
    }

    const { rows: existingEnroll } = await client.query(
      `
        SELECT id
        FROM class_enrollments
        WHERE class_id = $1
          AND client_id = $2
          AND fecha_sesion = $3::date
        LIMIT 1
      `,
      [classId, clientId, sessionDate]
    );

    if (existingEnroll[0]) {
      await client.query('ROLLBACK');
      return { status: 'ALREADY_ENROLLED' };
    }

    const { rows: countRows } = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM class_enrollments
        WHERE class_id = $1
          AND fecha_sesion = $2::date
      `,
      [classId, sessionDate]
    );

    if ((countRows[0]?.total ?? 0) >= cls.cupo_maximo) {
      await client.query('ROLLBACK');
      return { status: 'FULL' };
    }

    await client.query(
      `
        INSERT INTO class_enrollments (id, class_id, client_id, fecha_sesion)
        VALUES ($1, $2, $3, $4::date)
      `,
      [enrollmentId, classId, clientId, sessionDate]
    );

    await client.query('COMMIT');
    const updatedClass = await findClassById(classId, clientId);
    return { status: 'OK', class: updatedClass, fecha_sesion: sessionDate };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const unenrollClientFromClass = async ({ classId, clientId, fechaSesion = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: classRows } = await client.query(
      `
        SELECT
          c.id,
          c.estado,
          (${PROXIMA_FECHA_SQL})::text AS proxima_fecha
        FROM classes c
        WHERE c.id = $1
        FOR UPDATE
      `,
      [classId]
    );

    const cls = classRows[0];
    if (!cls) {
      await client.query('ROLLBACK');
      return { status: 'NOT_FOUND' };
    }

    const sessionDate = fechaSesion || cls.proxima_fecha;

    const { rowCount } = await client.query(
      `
        DELETE FROM class_enrollments
        WHERE class_id = $1
          AND client_id = $2
          AND fecha_sesion = $3::date
      `,
      [classId, clientId, sessionDate]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return { status: 'NOT_ENROLLED' };
    }

    await client.query('COMMIT');
    const updatedClass = await findClassById(classId, clientId);
    return { status: 'OK', class: updatedClass, fecha_sesion: sessionDate };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listEnrollmentsByClassId = async (classId, fechaSesion = null) => {
  const { rows } = await pool.query(
    `
      SELECT
        ce.id AS enrollment_id,
        ce.fecha_sesion::text AS fecha_sesion,
        ce.inscrito_en,
        u.id AS client_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.tipo_documento,
        u.numero_documento
      FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      JOIN users u ON u.id = ce.client_id
      WHERE ce.class_id = $1
        AND ce.fecha_sesion = COALESCE($2::date, (${PROXIMA_FECHA_SQL}))
      ORDER BY ce.inscrito_en ASC
    `,
    [classId, fechaSesion]
  );
  return rows;
};

export const listTodayEnrolledClassesForClientAndTrainer = async ({ clientId, trainerId }) => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.nombre_clase,
        c.sala,
        c.dia_semana,
        ce.fecha_sesion::text AS fecha_sesion,
        c.hora_inicio,
        c.hora_fin,
        c.estado
      FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      WHERE ce.client_id = $1
        AND c.entrenador_id = $2
        AND ce.fecha_sesion = ${LIMA_TODAY}
        AND c.estado = 'activa'
      ORDER BY c.hora_inicio ASC
    `,
    [clientId, trainerId]
  );
  return rows;
};
