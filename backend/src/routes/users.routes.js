import { Router } from 'express';
import { changeEmail, changePassword, createUser, getAllUsers, getUserById, searchUsersForManualAccess, updateUser } from '../controllers/users.controller.js';
import { supabase } from '../lib/supabaseClient.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changeEmailSchema, changePasswordSchema, createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

// Función auxiliar para calcular la similitud de coseno
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

// Obtener clientes que ya tienen registro facial (para actualización)
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

router.post('/register-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { userId, embedding } = req.body;

    if (!userId || !embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios o embedding inválido.' });
    }

    // Consultar solo un lote seguro para evitar saturar memoria
    const { data: existingFaces, error: fetchError } = await supabase
      .from('client_facials')
      .select('user_id, embedding')
      .neq('user_id', userId)
      .limit(100);

    if (fetchError) {
      console.error('[Error Supabase Fetch]:', fetchError);
      return res.status(500).json({ success: false, message: 'Error al consultar la base de datos de rostros.' });
    }

    const THRESHOLD = 0.45;

    if (existingFaces && existingFaces.length > 0) {
      for (const row of existingFaces) {
        let storedEmbedding = row.embedding;
        
        if (typeof storedEmbedding === 'string') {
          try { storedEmbedding = JSON.parse(storedEmbedding); } catch (e) { continue; }
        }

        if (!Array.isArray(storedEmbedding) || storedEmbedding.length !== embedding.length) {
          continue;
        }

        const similarity = cosineSimilarity(embedding, storedEmbedding);

        if (similarity >= THRESHOLD) {
          return res.status(400).json({
            success: false,
            message: 'Este rostro ya se encuentra registrado en el sistema asociado a otra cuenta.'
          });
        }
      }
    }

    // Upsert rápido y atómico
    const { error: upsertError } = await supabase
      .from('client_facials')
      .upsert(
        { user_id: userId, embedding: embedding, updated_at: new Date() },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      return res.status(400).json({ success: false, message: upsertError.message || 'Error al guardar en la base de datos.' });
    }

    return res.json({ success: true, message: 'Rostro registrado correctamente' });
  } catch (err) {
    console.error('Error crítico en /register-face:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el rostro.' });
  }
});

router.get('/:id', requireAuth, getUserById);
router.patch('/:id', requireAuth, validate(updateUserSchema), updateUser);
router.patch('/:id/email', requireAuth, validate(changeEmailSchema), changeEmail);
router.patch('/:id/password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;