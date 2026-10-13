import { supabase } from '../lib/supabaseClient.js';
import { findUserBySupabaseId } from '../db/users.js';

export const ROLES = {
  CLIENT: 'CLIENT',
  RECEPTIONIST: 'RECEPTIONIST',
  MANAGER: 'MANAGER',
};

const getBearerToken = (req) => {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

export const requireAuth = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó el token de autenticación' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Por favor, inicia sesión nuevamente.' });
  }

  const user = await findUserBySupabaseId(data.user.id);
  if (!user) {
    return res.status(403).json({ error: 'No se encontró un perfil asociado a esta cuenta' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Esta cuenta ha sido desactivada. Comunícate con la administración.' });
  }
  req.authUserId = data.user.id;
  req.user = user;
  next();
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }
  next();
};