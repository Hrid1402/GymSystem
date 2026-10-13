import { supabase, supabaseAdmin } from '../lib/supabaseClient.js';
import { findUserBySupabaseId, findUserByEmail, findUserByDni, insertUser } from '../db/users.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: 'Correo electrónico o contraseña incorrectos' });
  }

  if (!data?.user?.id ||
  !data?.session?.access_token ||
  !data?.session?.refresh_token) {
    return res.status(502).json({ error: 'El servicio de autenticación devolvió una sesión inválida' });
  }

  const user = await findUserBySupabaseId(data.user.id);
  if (!user) return res.status(403).json({ error: 'No se encontró un perfil asociado a esta cuenta' });
  if (!user.is_active) return res.status(403).json({ error: 'Esta cuenta ha sido desactivada. Comunícate con la administración.' });

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user,
  });
};

export const register = async (req, res) => {
  const { email, password, first_name, last_name, dni, phone, date_of_birth } = req.body;

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

  // 3. Crear cuenta en Supabase Auth
  const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
  if (error || !data.user) {
    if (error?.code === 'user_already_exists' || error?.message?.toLowerCase().includes('already registered')) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico' });
    }
    return res.status(400).json({ error: error?.message ?? 'No se pudo crear la cuenta' });
  }

  try {
    // Hardcoded: self-registration is always a client
    const user = await insertUser({
      id: newId('USR'),
      supabaseUserId: data.user.id,
      email: cleanEmail,
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      dni: cleanDni,
      phone: phone ? phone.trim() : null,
      dateOfBirth: date_of_birth,
      role: ROLES.CLIENT,
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

export const me = (req, res) => res.json({ user: req.user });

export const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

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

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.authUserId, {
    password: new_password,
  });
  if (error) throw error;

  res.status(204).send();
};