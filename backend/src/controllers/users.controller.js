import { supabase, supabaseAdmin } from '../lib/supabaseClient.js';
import {
  listUsers,
  findUserById,
  findSupabaseIdByUserId,
  insertUser,
  updateUserFields,
  updateUserEmail,
} from '../db/users.js';
import { canManageUser, editableFields } from '../lib/permissions.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

export const getAllUsers = async (req, res) => {
  // Receptionists only ever see clients
  const users = await listUsers({ onlyClients: req.user.role === ROLES.RECEPTIONIST });
  res.json({ users });
};

export const getUserById = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }
  res.json({ user: target });
};

export const createUser = async (req, res) => {
  const { email, password, first_name, last_name, dni, phone, date_of_birth } = req.body;

  // Receptionists can only create clients; managers choose (default CLIENT)
  const role = req.body.role ?? ROLES.CLIENT;
  if (req.user.role !== ROLES.MANAGER && role !== ROLES.CLIENT) {
    return res.status(403).json({ error: 'Only managers can create users with this role' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw error;
  }

  try {
    const user = await insertUser({
      id: newId('USR'),
      supabaseUserId: data.user.id,
      email,
      firstName: first_name,
      lastName: last_name,
      dni,
      phone,
      dateOfBirth: date_of_birth,
      role,
    });
    return res.status(201).json({ user });
  } catch (err) {
    // Don't leave an orphan auth account behind
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email or DNI already exists' });
    }
    throw err;
  }
};

export const updateUser = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }

  // Refuse visibly instead of silently ignoring fields the actor can't change
  const allowed = editableFields(req.user, target);
  const forbidden = Object.keys(req.body).filter((key) => !allowed.includes(key));
  if (forbidden.length > 0) {
    return res.status(403).json({ error: `You cannot change: ${forbidden.join(', ')}` });
  }

  try {
    const user = await updateUserFields(target.id, req.body);
    res.json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that DNI already exists' });
    }
    throw err;
  }
};

export const changeEmail = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }

  const { email, current_password } = req.body;

  // Changing your own email requires proving you know the current password
  if (req.user.id === target.id) {
    if (!current_password) {
      return res.status(400).json({ error: 'current_password is required to change your own email' });
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });
    if (loginError) {
      if (loginError.code === 'invalid_credentials') {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      throw loginError;
    }
  }

  const authId = await findSupabaseIdByUserId(target.id);

  // 1. Supabase first (login depends on it)
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    email,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw error;
  }

  // 2. Then our copy; if it fails, put the old email back in Supabase
  try {
    const user = await updateUserEmail(target.id, email);
    res.json({ user });
  } catch (err) {
    await supabaseAdmin.auth.admin.updateUserById(authId, {
      email: target.email,
      email_confirm: true,
    });
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    throw err;
  }
};

export const changePassword = async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (!canManageUser(req.user, target)) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }

  const { new_password, current_password } = req.body;

  // Changing your own password requires proving you know the current one
  if (req.user.id === target.id) {
    if (!current_password) {
      return res.status(400).json({ error: 'current_password is required to change your own password' });
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });
    if (loginError) {
      if (loginError.code === 'invalid_credentials') {
        // 400, not 401, so the frontend doesn't think the session expired
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      throw loginError;
    }
  }

  const authId = await findSupabaseIdByUserId(target.id);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    password: new_password,
  });
  if (error) throw error;

  res.json({ message: 'Password updated' });
};