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
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await findUserBySupabaseId(data.user.id);
  if (!user) {
    return res.status(403).json({ error: 'No profile found for this account' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'This account has been deactivated' });
  }

  req.user = user;
  next();
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }
  next();
};