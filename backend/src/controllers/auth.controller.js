import { supabase, supabaseAdmin } from '../lib/supabaseClient.js';
import { findUserBySupabaseId, insertUser } from '../db/users.js';
import { newId } from '../lib/id.js';
import { ROLES } from '../middleware/auth.middleware.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = await findUserBySupabaseId(data.user.id);
  if (!user) return res.status(403).json({ error: 'No profile found for this account' });
  if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated' });

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user,
  });
};

export const register = async (req, res) => {
  const { email, password, first_name, last_name, dni, phone, date_of_birth } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return res.status(400).json({ error: error?.message ?? 'Could not create account' });
  }

  try {
    // Hardcoded: self-registration is always a client
    const user = await insertUser({
      id: newId('USR'),
      supabaseUserId: data.user.id,
      email,
      firstName: first_name,
      lastName: last_name,
      dni,
      phone,
      dateOfBirth: date_of_birth,
      role: ROLES.CLIENT,
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

export const me = (req, res) => res.json({ user: req.user });