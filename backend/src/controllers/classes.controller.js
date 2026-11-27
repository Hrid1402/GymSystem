import {
  countFutureEnrollments,
  deleteClassByIdIfEmpty,
  enrollClientInClass,
  findClassById,
  findScheduleConflicts,
  insertClass,
  listClassesForUser,
  listEnrollmentsByClassId,
  unenrollClientFromClass,
  updateClassById,
} from '../db/classes.js';
import { expireMemberships, findActiveMembership } from '../db/memberships.js';
import { findCatalogById } from '../db/classCatalog.js';
import { getGymSettings } from '../db/settings.js';
import { findUserById } from '../db/users.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

function normalizeTime(timeStr) {
  const parts = String(timeStr).trim().split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
}

async function validateClassAgainstSettings({ sala, startNorm, endNorm }) {
  const settings = await getGymSettings();
  const allowedRooms = new Set(
    Array.from({ length: settings.totalRooms }, (_, i) => `Sala ${i + 1}`)
  );
  if (!allowedRooms.has(sala)) {
    return `La sala seleccionada no es válida. El gimnasio cuenta con ${settings.totalRooms} sala(s) disponible(s) (Sala 1 a Sala ${settings.totalRooms}).`;
  }
  const openNorm = `${settings.openingTime}:00`;
  const closeNorm = `${settings.closingTime}:00`;
  if (startNorm < openNorm || endNorm > closeNorm) {
    return `El horario de la clase debe estar dentro del horario de atención (${settings.openingTime} - ${settings.closingTime}).`;
  }
  return null;
}

export const getClasses = async (req, res) => {
  const classes = await listClassesForUser(req.user?.id || null);
  return res.json({ classes });
};

export const enrollClass = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  await expireMemberships();
  const activeMembership = await findActiveMembership(userId);
  if (!activeMembership) {
    return res.status(403).json({
      error: 'Se requiere una membresía activa para inscribirte a clases grupales',
    });
  }

  const nivelClases = activeMembership.nivel_clases || 'ninguna';
  if (nivelClases === 'ninguna') {
    return res.status(403).json({
      error: 'Tu plan actual no incluye acceso a clases grupales. Mejora a un plan con acceso a clases.',
    });
  }

  const targetClass = await findClassById(req.params.id);
  if (!targetClass) {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }

  if (nivelClases === 'basicas' && targetClass.categoria === 'especializada') {
    return res.status(403).json({
      error: 'Esta clase especializada requiere un plan con acceso completo a clases.',
    });
  }

  const fechaSesion = req.body?.fecha_sesion ? String(req.body.fecha_sesion).slice(0, 10) : null;

  const result = await enrollClientInClass({
    enrollmentId: newId('ENR'),
    classId: req.params.id,
    clientId: userId,
    fechaSesion,
  });

  if (result.status === 'NOT_FOUND') {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }
  if (result.status === 'CLOSED') {
    return res.status(400).json({
      error: 'Esta clase se encuentra pausada o inactiva actualmente',
    });
  }
  if (result.status === 'INVALID_DATE') {
    return res.status(400).json({
      error: 'La fecha seleccionada no corresponde al horario semanal de la clase o está fuera del rango permitido (próximos 14 días)',
    });
  }
  if (result.status === 'ALREADY_ENROLLED') {
    return res.status(409).json({
      error: 'Ya estás inscrito en esta sesión de clase',
    });
  }
  if (result.status === 'FULL') {
    return res.status(409).json({
      error: 'La clase alcanzó su cupo máximo para esta sesión',
    });
  }

  return res.status(201).json({
    message: 'Inscripción realizada correctamente',
    fecha_sesion: result.fecha_sesion,
    class: result.class,
  });
};

export const unenrollClass = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const fechaSesion =
    req.query?.fecha_sesion || req.body?.fecha_sesion
      ? String(req.query?.fecha_sesion || req.body?.fecha_sesion).slice(0, 10)
      : null;

  const result = await unenrollClientFromClass({
    classId: req.params.id,
    clientId: userId,
    fechaSesion,
  });

  if (result.status === 'NOT_FOUND') {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }
  if (result.status === 'NOT_ENROLLED') {
    return res.status(409).json({
      error: 'No estás inscrito en esta sesión de clase',
    });
  }

  return res.json({
    message: 'Reserva cancelada correctamente',
    fecha_sesion: result.fecha_sesion,
    class: result.class,
  });
};

export const createClass = async (req, res) => {
  const {
    catalog_id,
    nombre_clase,
    categoria,
    descripcion,
    entrenador_id,
    sala,
    dia_semana,
    hora_inicio,
    hora_fin,
    cupo_maximo,
  } = req.body;

  let resolvedNombre = nombre_clase ? nombre_clase.trim() : '';
  let resolvedCategoria = categoria || 'basica';
  let resolvedCatalogId = catalog_id || null;

  if (resolvedCatalogId) {
    const catItem = await findCatalogById(resolvedCatalogId);
    if (!catItem || !catItem.is_active) {
      return res.status(400).json({ error: 'La disciplina seleccionada del catálogo no existe o está inactiva' });
    }
    resolvedNombre = catItem.nombre;
    resolvedCategoria = catItem.categoria;
  }

  const trainer = await findUserById(entrenador_id);
  if (!trainer || trainer.role !== ROLES.TRAINER) {
    return res.status(400).json({ error: 'El entrenador seleccionado no es válido' });
  }

  const startNorm = normalizeTime(hora_inicio);
  const endNorm = normalizeTime(hora_fin);

  const settingsError = await validateClassAgainstSettings({ sala, startNorm, endNorm });
  if (settingsError) {
    return res.status(400).json({ error: settingsError });
  }

  const conflicts = await findScheduleConflicts({
    entrenadorId: entrenador_id,
    sala,
    diaSemana: Number(dia_semana),
    horaInicio: startNorm,
    horaFin: endNorm,
  });

  if (conflicts.length > 0) {
    const trainerConflict = conflicts.some((c) => c.entrenador_id === entrenador_id);
    return res.status(409).json({
      error: trainerConflict
        ? 'El entrenador ya tiene una clase asignada en ese día y horario'
        : `La ${sala} ya tiene una clase programada en ese día y horario`,
      conflicts,
    });
  }

  const created = await insertClass({
    id: newId('CLS'),
    catalogId: resolvedCatalogId,
    nombreClase: resolvedNombre,
    categoria: resolvedCategoria,
    descripcion: descripcion ? descripcion.trim() : null,
    entrenadorId: entrenador_id,
    sala,
    diaSemana: Number(dia_semana),
    horaInicio: startNorm,
    horaFin: endNorm,
    cupoMaximo: Number(cupo_maximo),
    estado: 'activa',
  });

  return res.status(201).json({ class: created });
};

export const deleteClass = async (req, res) => {
  const existing = await findClassById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }

  const futureCount = await countFutureEnrollments(existing.id);
  if (futureCount > 0) {
    return res.status(409).json({
      error: 'No se puede eliminar una clase que ya tiene participantes inscritos en sesiones próximas',
    });
  }

  const deleted = await deleteClassByIdIfEmpty(existing.id);
  if (!deleted) {
    return res.status(409).json({
      error: 'No se pudo eliminar la clase porque ya cuenta con participantes inscritos',
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
    catalog_id,
    nombre_clase,
    categoria,
    descripcion,
    entrenador_id,
    sala,
    dia_semana,
    hora_inicio,
    hora_fin,
    cupo_maximo,
    estado,
  } = req.body;

  let resolvedCatalogId = catalog_id !== undefined ? catalog_id : existing.catalog_id;
  let resolvedNombre = nombre_clase ? nombre_clase.trim() : existing.nombre_clase;
  let resolvedCategoria = categoria || existing.categoria || 'basica';

  if (resolvedCatalogId) {
    const catItem = await findCatalogById(resolvedCatalogId);
    if (!catItem) {
      return res.status(400).json({ error: 'La disciplina seleccionada del catálogo no existe' });
    }
    resolvedNombre = catItem.nombre;
    resolvedCategoria = catItem.categoria;
  }

  const trainer = await findUserById(entrenador_id);
  if (!trainer || trainer.role !== ROLES.TRAINER) {
    return res.status(400).json({ error: 'El entrenador seleccionado no es válido' });
  }

  const startNorm = normalizeTime(hora_inicio);
  const endNorm = normalizeTime(hora_fin);

  const settingsError = await validateClassAgainstSettings({ sala, startNorm, endNorm });
  if (settingsError) {
    return res.status(400).json({ error: settingsError });
  }
  const targetEstado = estado || existing.estado || 'activa';

  if (targetEstado === 'activa') {
    const conflicts = await findScheduleConflicts({
      entrenadorId: entrenador_id,
      sala,
      diaSemana: Number(dia_semana),
      horaInicio: startNorm,
      horaFin: endNorm,
      excludeClassId: existing.id,
    });

    if (conflicts.length > 0) {
      const trainerConflict = conflicts.some((c) => c.entrenador_id === entrenador_id);
      return res.status(409).json({
        error: trainerConflict
          ? 'El entrenador ya tiene una clase asignada en ese día y horario'
          : `La ${sala} ya tiene una clase programada en ese día y horario`,
        conflicts,
      });
    }
  }

  const updated = await updateClassById(existing.id, {
    catalogId: resolvedCatalogId,
    nombreClase: resolvedNombre,
    categoria: resolvedCategoria,
    descripcion: descripcion ? descripcion.trim() : null,
    entrenadorId: entrenador_id,
    sala,
    diaSemana: Number(dia_semana),
    horaInicio: startNorm,
    horaFin: endNorm,
    cupoMaximo: Number(cupo_maximo),
    estado: targetEstado,
  });

  return res.json({ class: updated });
};

export const getClassEnrollments = async (req, res) => {
  const existing = await findClassById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clase no encontrada' });
  }

  // Si es TRAINER, solo puede ver los participantes de las clases que tiene asignadas
  if (req.user?.role === ROLES.TRAINER && existing.entrenador_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver los participantes de esta clase' });
  }

  const fechaSesion = req.query?.fecha_sesion ? String(req.query.fecha_sesion).slice(0, 10) : null;
  const enrollments = await listEnrollmentsByClassId(existing.id, fechaSesion);
  return res.json({ class: existing, enrollments, proxima_fecha: fechaSesion || existing.proxima_fecha });
};
