import { Router } from 'express';
import { changeEmail, changePassword, createUser, getAllUsers, getUserById, searchUsersForManualAccess, updateUser } from '../controllers/users.controller.js';
import { supabase } from '../lib/supabaseClient.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changeEmailSchema, changePasswordSchema, createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

router.get('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), getAllUsers);
router.post('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), validate(createUserSchema), createUser);
router.get('/search', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), searchUsersForManualAccess);

// RUTA: Obtener clientes pendientes de registro facial
router.get('/pending-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { data: registeredFaces, error: faceError } = await supabase
      .from('client_facials')
      .select('user_id');

    if (faceError) throw faceError;

    const registeredIds = registeredFaces.map(f => f.user_id);

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, dni, phone')
      .eq('role', 'CLIENT');

    if (registeredIds.length > 0) {
      query = query.not('id', 'in', `(${registeredIds.join(',')})`);
    }

    const { data: pendingClients, error: clientError } = await query;

    if (clientError) throw clientError;

    return res.json(pendingClients);
  } catch (err) {
    console.error('Error al obtener clientes pendientes:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA NUEVA: Obtener clientes que YA tienen registro facial (para actualización)
router.get('/registered-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { data: registeredFaces, error: faceError } = await supabase
      .from('client_facials')
      .select('user_id');

    if (faceError) throw faceError;

    const registeredIds = registeredFaces.map(f => f.user_id);

    if (registeredIds.length === 0) {
      return res.json([]);
    }

    const { data: registeredClients, error: clientError } = await supabase
      .from('users')
      .select('id, first_name, last_name, dni, phone')
      .eq('role', 'CLIENT')
      .in('id', registeredIds);

    if (clientError) throw clientError;

    return res.json(registeredClients);
  } catch (err) {
    console.error('Error al obtener clientes con rostro registrado:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTA: Registrar o actualizar el embedding facial del cliente
router.post('/register-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { userId, embedding } = req.body;

    if (!userId || !embedding) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (userId o embedding)' });
    }

    const { data: existing, error: findError } = await supabase
      .from('client_facials')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) throw findError;

    let result;
    if (existing) {
      result = await supabase
        .from('client_facials')
        .update({ 
          embedding: embedding,
          updated_at: new Date()
        })
        .eq('user_id', userId);
    } else {
      result = await supabase
        .from('client_facials')
        .insert({ 
          user_id: userId, 
          embedding: embedding,
          updated_at: new Date()
        });
    }

    if (result.error) {
      return res.status(400).json({ error: result.error.message || 'Error al guardar en la base de datos' });
    }

    return res.json({ success: true, message: 'Rostro registrado correctamente', data: result.data });
  } catch (err) {
    console.error('Error interno al registrar rostro:', err.message || err);
    return res.status(500).json({ error: err.message || 'Error interno al guardar el rostro' });
  }
});

router.get('/:id', requireAuth, getUserById);
router.patch('/:id', requireAuth, validate(updateUserSchema), updateUser);
router.patch('/:id/email', requireAuth, validate(changeEmailSchema), changeEmail);
router.patch('/:id/password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;