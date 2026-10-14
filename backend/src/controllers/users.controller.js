import {
  findSupabaseIdByUserId,
  findUserById,
  findUserByEmail,
  findUserByDni,
  insertUser,
  listUsers,
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
  const { email, password, first_name, last_name, dni, phone, date_of_birth } = req.body;

  // Receptionists can only create clients; managers choose (default CLIENT)
  const role = req.body.role ?? ROLES.CLIENT;
  if (req.user.role !== ROLES.MANAGER && role !== ROLES.CLIENT) {
    return res.status(403).json({ error: 'Solo los gerentes pueden crear usuarios con este rol' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanDni = dni.trim();

  // 1. Validar si el DNI ya existe en la base de datos
  const existingByDni = await findUserByDni(cleanDni);
  if (existingByDni) {
    return res.status(409).json({ error: 'Ya existe un usuario registrado con este DNI' });
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
      dni: cleanDni,
      phone: phone ? phone.trim() : null,
      dateOfBirth: date_of_birth,
      role,
    });
    return res.status(201).json({ user });
  } catch (err) {
    // Don't leave an orphan auth account behind
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    if (err.code === '23505') {
      if (err.constraint === 'users_dni_key' || err.detail?.includes('dni')) {
        return res.status(409).json({ error: 'Ya existe un usuario registrado con este DNI' });
      }
      if (err.constraint === 'users_email_key' || err.detail?.includes('email')) {
        return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
      }
      return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico o DNI' });
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

  try {
    const user = await updateUserFields(target.id, req.body);
    res.json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con este DNI' });
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


import { searchClients } from '../db/users.js'; // importar función de búsqueda de clientes desde el archivo db/users.js
// Controlador para búsqueda manual de clientes por recepcionistas
export const searchUsersForManualAccess = async (req, res) => {
  const { q } = req.query; // variable que guarda lo que la recepcionista va escribiendo

  // si deja el campo vacío, no hace la búsqueda y devuelve un error
  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'El término de búsqueda es obligatorio' });
  }

  // devuelve resultados, si no, muestra un error
  try {
    const users = await searchClients(q.trim());
    res.json({ users });
  } catch (err) {
    console.error('Error al buscar clientes:', err);
    throw err;
  }
};