import { ROLES } from '../middleware/auth.middleware.js';

// Can the actor touch this user at all?
export const canManageUser = (actor, target) => {
  if (actor.id === target.id) return true;                         // yourself
  if (actor.role === ROLES.MANAGER) return true;                   // manager: anyone
  if (actor.role === ROLES.RECEPTIONIST) return target.role === ROLES.CLIENT; // receptionist: clients only
  return false;
};

// Which fields can the actor change on this user?
export const editableFields = (actor, target) => {
  const fields = ['first_name', 'last_name', 'phone', 'date_of_birth'];
  const isSelf = actor.id === target.id;

  if (actor.role === ROLES.MANAGER) {
    fields.push('dni');
    if (!isSelf) fields.push('role', 'is_active'); // a manager can't demote or deactivate themselves
  } else if (actor.role === ROLES.RECEPTIONIST && !isSelf) {
    fields.push('dni'); // only reachable on clients, canManageUser already filtered
  }

  return fields;
};