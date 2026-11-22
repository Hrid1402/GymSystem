import { pool } from './index.js';

export const listClasses = async () => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.nombre_clase,
        c.descripcion,
        c.entrenador_id,
        u.first_name AS entrenador_nombre,
        u.last_name AS entrenador_apellido,
        c.sala,
        c.fecha_clase,
        c.hora_inicio,
        c.hora_fin,
        c.cupo_maximo,
        c.inscritos_actuales,
        c.estado,
        c.creado_en,
        c.actualizado_en
      FROM classes c
      JOIN users u ON u.id = c.entrenador_id
      ORDER BY c.fecha_clase ASC, c.hora_inicio ASC, c.creado_en DESC
    `
  );
  return rows;
};

export const findClassById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM classes WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
};

export const updateClassStatus = async (id, estado) => {
  const { rows } = await pool.query(
    `
      UPDATE classes
      SET estado = $2, actualizado_en = NOW()
      WHERE id = $1
      RETURNING estado
    `,
    [id, estado]
  );
  return rows[0]?.estado || estado;
};

/**
 * Busca choques en la misma fecha_clase para el mismo entrenador o la misma sala.
 * Dos rangos [h1_inicio, h1_fin) y [h2_inicio, h2_fin) se superponen si h1_inicio < h2_fin AND h1_fin > h2_inicio.
 */
export const findScheduleConflicts = async ({
  entrenadorId,
  sala,
  fechaClase,
  horaInicio,
  horaFin,
  excludeClassId = null,
}) => {
  const params = [entrenadorId, sala, fechaClase, horaInicio, horaFin];
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
        c.fecha_clase,
        c.hora_inicio,
        c.hora_fin
      FROM classes c
      WHERE c.estado <> 'cancelada'
        AND c.fecha_clase = $3::date
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
  nombreClase,
  descripcion = null,
  entrenadorId,
  sala,
  fechaClase,
  horaInicio,
  horaFin,
  cupoMaximo,
  inscritosActuales = 0,
  estado = 'programada',
}) => {
  const { rows } = await pool.query(
    `
      INSERT INTO classes (
        id, nombre_clase, descripcion, entrenador_id, sala, fecha_clase,
        hora_inicio, hora_fin, cupo_maximo, inscritos_actuales, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9, $10, $11)
      RETURNING *
    `,
    [
      id,
      nombreClase,
      descripcion,
      entrenadorId,
      sala,
      fechaClase,
      horaInicio,
      horaFin,
      cupoMaximo,
      inscritosActuales,
      estado,
    ]
  );
  return rows[0];
};

export const updateClassById = async (id, fields) => {
  const { rows } = await pool.query(
    `
      UPDATE classes
      SET
        nombre_clase = $2,
        descripcion = $3,
        entrenador_id = $4,
        sala = $5,
        fecha_clase = $6::date,
        hora_inicio = $7::time,
        hora_fin = $8::time,
        cupo_maximo = $9,
        inscritos_actuales = $10,
        estado = $11,
        actualizado_en = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      fields.nombreClase,
      fields.descripcion ?? null,
      fields.entrenadorId,
      fields.sala,
      fields.fechaClase,
      fields.horaInicio,
      fields.horaFin,
      fields.cupoMaximo,
      fields.inscritosActuales,
      fields.estado,
    ]
  );
  return rows[0] || null;
};

export const deleteClassByIdIfEmpty = async (id) => {
  const { rows } = await pool.query(
    `
      DELETE FROM classes
      WHERE id = $1
        AND inscritos_actuales = 0
      RETURNING id
    `,
    [id]
  );
  return rows[0] || null;
};