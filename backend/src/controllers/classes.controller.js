import {
    deleteClassByIdIfEmpty,
    findClassById,
    findScheduleConflicts,
    insertClass,
    listClasses,
    updateClassById,
    updateClassStatus
} from '../db/classes.js';
import { findUserById } from '../db/users.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

function normalizeTime(timeStr) {
  const parts = String(timeStr).trim().split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
}

function normalizeDateStr(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(dateInput).slice(0, 10);
}

function buildDateTime(dateStr, timeStr) {
  const cleanDate = normalizeDateStr(dateStr);
  const [yyyy, mm, dd] = cleanDate.split('-').map(Number);
  const [hh, min, ss] = normalizeTime(timeStr).split(':').map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min, ss || 0, 0);
}

function isBeforeCurrentDateTime(fechaClase, horaInicio) {
  const now = new Date();
  const scheduledStart = buildDateTime(fechaClase, horaInicio);
  return scheduledStart < now;
}

/**
 * Calcula el estado automático según fecha y hora actuales:
 * - Si está 'cancelada', se mantiene 'cancelada'.
 * - Si now >= hora_inicio y now < hora_fin -> 'en_curso'.
 * - Si now >= hora_fin y estaba 'programada' o 'en_curso' -> 'completada'.
 * - En caso contrario -> 'programada'.
 */
function resolveAutomaticStatus(cls) {
  if (cls.estado === 'cancelada') return 'cancelada';

  const now = new Date();
  const start = buildDateTime(cls.fecha_clase, cls.hora_inicio);
  const end = buildDateTime(cls.fecha_clase, cls.hora_fin);

  if (now >= start && now < end) {
    return 'en_curso';
  }
  if (now >= end && (cls.estado === 'programada' || cls.estado === 'en_curso')) {
    return 'completada';
  }
  return 'programada';
}

async function syncClassStatusIfNeeded(cls) {
  const computed = resolveAutomaticStatus(cls);
  if (computed !== cls.estado) {
    await updateClassStatus(cls.id, computed);
    return { ...cls, estado: computed };
  }
  return cls;
}

export const getClasses = async (req, res) => {
  const rawClasses = await listClasses();
  const classes = await Promise.all(rawClasses.map(syncClassStatusIfNeeded));
  res.json({ classes });
};

export const createClass = async (req, res) => {
  const {
    nombre_clase,
    descripcion,
    entrenador_id,
    sala,
    fecha_clase,
    hora_inicio,
    hora_fin,
    cupo_maximo,
  } = req.body;

  const trainer = await findUserById(entrenador_id);
  if (!trainer || trainer.role !== ROLES.TRAINER) {
    return res.status(400).json({ error: 'El entrenador seleccionado no es válido' });
  }

  const startNorm = normalizeTime(hora_inicio);
  const endNorm = normalizeTime(hora_fin);

  if (isBeforeCurrentDateTime(fecha_clase, startNorm)) {
    return res.status(400).json({
      error: 'La fecha y hora de inicio no pueden ser anteriores a la fecha y hora actuales',
    });
  }

  const conflicts = await findScheduleConflicts({
    entrenadorId: entrenador_id,
    sala,
    fechaClase: fecha_clase,
    horaInicio: startNorm,
    horaFin: endNorm,
  });

  if (conflicts.length > 0) {
    const trainerConflict = conflicts.some((c) => c.entrenador_id === entrenador_id);
    return res.status(409).json({
      error: trainerConflict
        ? 'El entrenador ya tiene una clase asignada en esa fecha y horario y no puede estar en otro lugar al mismo tiempo'
        : `La ${sala} ya tiene una clase programada en esa fecha y horario`,
      conflicts,
    });
  }

  const created = await insertClass({
    id: newId('CLS'),
    nombreClase: nombre_clase.trim(),
    descripcion: descripcion ? descripcion.trim() : null,
    entrenadorId: entrenador_id,
    sala,
    fechaClase: fecha_clase,
    horaInicio: startNorm,
    horaFin: endNorm,
    cupoMaximo: Number(cupo_maximo),
    inscritosActuales: 0,
    estado: 'programada',
  });

  const synced = await syncClassStatusIfNeeded(created);
  return res.status(201).json({ class: synced });
};

export const deleteClass = async (req, res) => {
  const existing = await findClassById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }

  if ((existing.inscritos_actuales ?? 0) > 0) {
    return res.status(409).json({
      error: 'No se puede eliminar una clase que ya tiene inscritos',
    });
  }

  const deleted = await deleteClassByIdIfEmpty(existing.id);
  if (!deleted) {
    return res.status(409).json({
      error: 'No se pudo eliminar la clase porque ya cuenta con inscritos',
    });
  }

  return res.json({ deletedId: deleted.id, message: 'Clase eliminada correctamente' });
};

export const updateClass = async (req, res) => {
  const existing = await findClassById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }

  const {
    nombre_clase,
    descripcion,
    entrenador_id,
    sala,
    fecha_clase,
    hora_inicio,
    hora_fin,
    cupo_maximo,
    estado,
  } = req.body;

  const trainer = await findUserById(entrenador_id);
  if (!trainer || trainer.role !== ROLES.TRAINER) {
    return res.status(400).json({ error: 'El entrenador seleccionado no es válido' });
  }

  const startNorm = normalizeTime(hora_inicio);
  const endNorm = normalizeTime(hora_fin);

  const conflicts = await findScheduleConflicts({
    entrenadorId: entrenador_id,
    sala,
    fechaClase: fecha_clase,
    horaInicio: startNorm,
    horaFin: endNorm,
    excludeClassId: existing.id,
  });

  if (conflicts.length > 0) {
    const trainerConflict = conflicts.some((c) => c.entrenador_id === entrenador_id);
    return res.status(409).json({
      error: trainerConflict
        ? 'El entrenador ya tiene una clase asignada en esa fecha y horario y no puede estar en otro lugar al mismo tiempo'
        : `La ${sala} ya tiene una clase programada en esa fecha y horario`,
      conflicts,
    });
  }

  // inscritos_actuales nunca se edita manualmente aquí; se conserva el valor actual
  const updated = await updateClassById(existing.id, {
    nombreClase: nombre_clase.trim(),
    descripcion:
      descripcion !== undefined
        ? descripcion
          ? descripcion.trim()
          : null
        : existing.descripcion,
    entrenadorId: entrenador_id,
    sala,
    fechaClase: fecha_clase,
    horaInicio: startNorm,
    horaFin: endNorm,
    cupoMaximo: Number(cupo_maximo),
    inscritosActuales: existing.inscritos_actuales ?? 0,
    estado: estado ?? existing.estado,
  });

  const synced = await syncClassStatusIfNeeded(updated);
  return res.json({ class: synced });
};