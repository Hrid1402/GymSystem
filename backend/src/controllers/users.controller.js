import { pool } from '../db/index.js';
import { expireMemberships, findActiveMembership } from '../db/memberships.js';
import { upsertTrainerProfile } from '../db/trainers.js';
import { listTodayEnrolledClassesForClientAndTrainer } from '../db/classes.js';
import {
  findSupabaseIdByUserId,
  findUserByDocument,
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  searchClients,
  updateUserEmail,
  updateUserFields,
} from '../db/users.js';
import { newId } from '../lib/id.js';
import { canManageUser, editableFields } from '../lib/permissions.js';
import { supabase, supabaseAdmin } from '../lib/supabaseClient.js';
import { ROLES } from '../middleware/auth.middleware.js';

export const getAllUsers = async (req, res) => {
  // Receptionists only ever see clients
  const users = await listUsers({ onlyClients: req.user.role === ROLES.RECEPTIONIST });
  res.json({ users });
};

export const getUserById = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }
  res.json({ user: target });
};

export const createUser = async (req, res) => {
  const { email, password, first_name, last_name, tipo_documento, numero_documento, phone, date_of_birth } = req.body;

  // Receptionists can only create clients; managers choose (default CLIENT)
  const role = req.body.role ?? ROLES.CLIENT;
  if (req.user.role !== ROLES.MANAGER && role !== ROLES.CLIENT) {
    return res.status(403).json({ error: 'Solo los gerentes pueden crear usuarios con este rol' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanDocNum = numero_documento ? numero_documento.trim() : '';
  const docType = tipo_documento ? tipo_documento.trim() : 'dni';

  // 1. Validar si el número de documento ya existe en la base de datos
  const existingByDoc = await findUserByDocument(docType, cleanDocNum);
  if (existingByDoc) {
    return res.status(409).json({ error: 'Ya existe un usuario registrado con este número de documento' });
  }

  // 2. Validar si el correo ya existe en la base de datos
  const existingByEmail = await findUserByEmail(cleanEmail);
  if (existingByEmail) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists' || error.message?.toLowerCase().includes('already registered')) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
    }
    throw error;
  }

  try {
    const user = await insertUser({
      id: newId('USR'),
      supabaseUserId: data.user.id,
      email: cleanEmail,
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      tipoDocumento: docType,
      numeroDocumento: cleanDocNum,
      phone: phone ? phone.trim() : null,
      dateOfBirth: date_of_birth,
      role,
    });

    let trainerProfile = null;
    if (role === ROLES.TRAINER) {
      trainerProfile = await upsertTrainerProfile(user.id, req.body.specialty);
    }

    return res.status(201).json({
      user: trainerProfile ? { ...user, specialty: trainerProfile.specialty } : user,
    });
  } catch (err) {
    // Don't leave an orphan auth account behind
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    if (err.code === '23505') {
      if (err.constraint === 'users_tipo_numero_doc_unique' || err.detail?.includes('numero_documento') || err.detail?.includes('dni')) {
        return res.status(409).json({ error: 'Ya existe un usuario registrado con este número de documento' });
      }
      if (err.constraint === 'users_email_key' || err.detail?.includes('email')) {
        return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
      }
      return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico o número de documento' });
    }
    throw err;
  }
};

export const updateUser = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  // Refuse visibly instead of silently ignoring fields the actor can't change
  const allowed = editableFields(req.user, target);
  const forbidden = Object.keys(req.body).filter((key) => !allowed.includes(key));
  if (forbidden.length > 0) {
    return res.status(403).json({ error: `No tienes permisos para modificar los siguientes campos: ${forbidden.join(', ')}` });
  }

  // Si se actualiza el número de documento, validar duplicados en BD
  if (req.body.numero_documento) {
    const cleanDocNum = req.body.numero_documento.trim();
    const docType = req.body.tipo_documento ? req.body.tipo_documento.trim() : target.tipo_documento;
    const existingByDoc = await findUserByDocument(docType, cleanDocNum);
    if (existingByDoc && existingByDoc.id !== target.id) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con este número de documento' });
    }
  }

  try {
    const { specialty, ...userFields } = req.body;
    const user =
      Object.keys(userFields).length > 0
        ? await updateUserFields(target.id, userFields)
        : target;

    let updatedSpecialty = target.specialty ?? null;
    if (target.role === ROLES.TRAINER && specialty !== undefined) {
      const profile = await upsertTrainerProfile(target.id, specialty);
      updatedSpecialty = profile.specialty;
    }

    const responseUser =
      target.role === ROLES.TRAINER
        ? { ...user, specialty: updatedSpecialty }
        : user;

    res.json({ user: responseUser });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con este número de documento' });
    }
    throw err;
  }
};

export const changeEmail = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  const { email, current_password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail === target.email.toLowerCase().trim()) {
    return res.status(400).json({ error: 'El nuevo correo electrónico debe ser diferente al actual' });
  }

  // Pre-verificación en base de datos local
  const existingUser = await findUserByEmail(cleanEmail);
  if (existingUser && existingUser.id !== target.id) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
  }

  // Changing your own email requires proving you know the current password
  if (req.user.id === target.id) {
    if (!current_password) {
      return res.status(400).json({ error: 'La contraseña actual es obligatoria para cambiar tu correo' });
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });
    if (loginError) {
      if (loginError.code === 'invalid_credentials') {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }
      throw loginError;
    }
  }

  const authId = await findSupabaseIdByUserId(target.id);

  // 1. Supabase first (login depends on it)
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    email: cleanEmail,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists' || error.message?.toLowerCase().includes('already exists') || error.status === 422) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
    }
    throw error;
  }

  // 2. Then our copy; if it fails, put the old email back in Supabase
  try {
    const user = await updateUserEmail(target.id, cleanEmail);
    res.json({ user });
  } catch (err) {
    await supabaseAdmin.auth.admin.updateUserById(authId, {
      email: target.email,
      email_confirm: true,
    });
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
    }
    throw err;
  }
};

export const changePassword = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  const { new_password, current_password } = req.body;

  // Changing your own password requires proving you know the current one
  if (req.user.id === target.id) {
    if (!current_password) {
      return res.status(400).json({ error: 'La contraseña actual es obligatoria para cambiar tu contraseña' });
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });
    if (loginError) {
      if (loginError.code === 'invalid_credentials') {
        // 400, not 401, so the frontend doesn't think the session expired
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }
      throw loginError;
    }
  }

  const authId = await findSupabaseIdByUserId(target.id);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    password: new_password,
  });
  if (error) throw error;

  res.json({ message: 'Contraseña actualizada correctamente' });
};

// Controlador para búsqueda manual de clientes por recepcionistas
export const searchUsersForManualAccess = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'El término de búsqueda es obligatorio' });
  }

  try {
    const users = await searchClients(q.trim());
    res.json({ users });
  } catch (err) {
    console.error('Error al buscar clientes:', err);
    throw err;
  }
};

export const getClientByDocumentForTrainer = async (req, res) => {
  const docNumber = String(req.query.numero_documento || '').trim();
  const docType = String(req.query.tipo_documento || '').trim().toLowerCase();

  if (!docNumber || !docType) {
    return res.status(400).json({
      error: 'El tipo y el número de documento son obligatorios',
    });
  }

  const { rows } = await pool.query(
    `
      SELECT id, first_name, last_name, tipo_documento, numero_documento, role, is_active
      FROM users
      WHERE LOWER(TRIM(tipo_documento)) = $1
        AND TRIM(numero_documento) = $2
        AND role = $3
      LIMIT 1
    `,
    [docType, docNumber, ROLES.CLIENT]
  );

  const target = rows[0];

  if (!target) {
    return res.status(404).json({
      error: 'Cliente no encontrado con ese tipo y número de documento',
    });
  }

  await expireMemberships();
  const [activeMembership, todayEnrolledClasses] = await Promise.all([
    findActiveMembership(target.id),
    listTodayEnrolledClassesForClientAndTrainer({
      clientId: target.id,
      trainerId: req.user.id,
    }),
  ]);

  return res.json({
    client: {
      id: target.id,
      first_name: target.first_name,
      last_name: target.last_name,
      tipo_documento: target.tipo_documento,
      numero_documento: target.numero_documento,
    },
    membership: activeMembership
      ? {
          id: activeMembership.id,
          plan_name: activeMembership.plan_name,
          nivel_clases: activeMembership.nivel_clases || 'ninguna',
          status: activeMembership.status,
          start_date: activeMembership.start_date,
          end_date: activeMembership.end_date,
        }
      : null,
    today_enrolled_classes: todayEnrolledClasses,
  });
};

export const getClientForTrainerLookup = async (req, res) => {
  const clientId = String(req.params.id || '').trim();
  if (!clientId) {
    return res.status(400).json({ error: 'El identificador del cliente es obligatorio' });
  }

  const target = await findUserById(clientId);
  if (!target || target.role !== ROLES.CLIENT) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  await expireMemberships();
  const [activeMembership, todayEnrolledClasses] = await Promise.all([
    findActiveMembership(target.id),
    listTodayEnrolledClassesForClientAndTrainer({
      clientId: target.id,
      trainerId: req.user.id,
    }),
  ]);

  return res.json({
    client: {
      id: target.id,
      first_name: target.first_name,
      last_name: target.last_name,
      tipo_documento: target.tipo_documento,
      numero_documento: target.numero_documento,
    },
    membership: activeMembership
      ? {
          id: activeMembership.id,
          plan_name: activeMembership.plan_name,
          nivel_clases: activeMembership.nivel_clases || 'ninguna',
          status: activeMembership.status,
          start_date: activeMembership.start_date,
          end_date: activeMembership.end_date,
        }
      : null,
    today_enrolled_classes: todayEnrolledClasses,
  });
};