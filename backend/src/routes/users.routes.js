import { Router } from 'express';
import { changeEmail, changePassword, createUser, getAllUsers, getClientByDocumentForTrainer, getClientForTrainerLookup, getUserById, searchUsersForManualAccess, updateUser } from '../controllers/users.controller.js';
import { pool } from '../db/index.js';
import { supabase } from '../lib/supabaseClient.js';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changeEmailSchema, changePasswordSchema, createUserSchema, updateUserSchema } from '../schemas/user.schema.js';

const router = Router();

// Similitud de coseno segura y validada
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = Number(vecA[i]);
    const b = Number(vecB[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return 0;
    }
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.get('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), getAllUsers);
router.post('/', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), validate(createUserSchema), createUser);
router.get('/search', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), searchUsersForManualAccess);

// RUTA: Obtener clientes pendientes de registro facial
router.get('/pending-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { rows: pendingClients } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.tipo_documento, u.numero_documento, u.phone
       FROM users u
       LEFT JOIN client_facials cf ON cf.user_id = u.id
       WHERE u.role = 'CLIENT' AND cf.user_id IS NULL
       ORDER BY u.created_at DESC`
    );

    return res.json(pendingClients);
  } catch (err) {
    console.error('Error al obtener clientes pendientes:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener clientes que ya tienen registro facial (para actualización)
router.get('/registered-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { rows: registeredClients } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.tipo_documento, u.numero_documento, u.phone
       FROM users u
       JOIN client_facials cf ON cf.user_id = u.id
       WHERE u.role = 'CLIENT'
       ORDER BY cf.updated_at DESC`
    );

    return res.json(registeredClients);
  } catch (err) {
    console.error('Error al obtener clientes con rostro registrado:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/register-face', requireAuth, requireRole(ROLES.MANAGER, ROLES.RECEPTIONIST), async (req, res) => {
  try {
    const { userId, embedding } = req.body;

    if (!userId || !Array.isArray(embedding) || embedding.length === 0) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios o embedding inválido.' });
    }

    const cleanEmbedding = embedding.map(Number);
    if (cleanEmbedding.some(v => !Number.isFinite(v))) {
      return res.status(400).json({ success: false, message: 'El embedding contiene valores inválidos.' });
    }

    // Consultar rostros excluyendo al usuario actual directamente en PostgreSQL
    const { rows: existingFaces } = await pool.query(
      'SELECT user_id, embedding FROM client_facials WHERE user_id != $1',
      [userId]
    );

    // Umbral estricto para evitar duplicados entre personas distintas
    const THRESHOLD = 0.75;

    if (existingFaces && existingFaces.length > 0) {
      for (const row of existingFaces) {
        if (String(row.user_id) === String(userId)) {
          continue;
        }

        let storedEmbedding = row.embedding;
        if (typeof storedEmbedding === 'string') {
          try {
            storedEmbedding = JSON.parse(storedEmbedding);
          } catch (e) {
            continue;
          }
        }

        if (!Array.isArray(storedEmbedding) || storedEmbedding.length !== cleanEmbedding.length) {
          continue;
        }

        const similarity = cosineSimilarity(cleanEmbedding, storedEmbedding);

        if (similarity >= THRESHOLD) {
          return res.status(400).json({
            success: false,
            message: 'Este rostro ya se encuentra registrado en el sistema asociado a otra cuenta.'
          });
        }
      }
    }

    // Upsert rápido y atómico en PostgreSQL
    await pool.query(
      `INSERT INTO client_facials (user_id, embedding, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
      [userId, JSON.stringify(cleanEmbedding)]
    );

    return res.json({ success: true, message: 'Rostro registrado correctamente' });
  } catch (err) {
    console.error('Error crítico en /register-face:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el rostro.' });
  }
});

router.get(
  '/trainer-lookup/by-document',
  requireAuth,
  requireRole(ROLES.TRAINER),
  getClientByDocumentForTrainer
);

router.get(
  '/:id/trainer-lookup',
  requireAuth,
  requireRole(ROLES.TRAINER),
  getClientForTrainerLookup
);

router.get('/:id', requireAuth, getUserById);
router.patch('/:id', requireAuth, validate(updateUserSchema), updateUser);
router.patch('/:id/email', requireAuth, validate(changeEmailSchema), changeEmail);
router.patch('/:id/password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;