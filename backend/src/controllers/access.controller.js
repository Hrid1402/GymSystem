import {
  getTodayAttendanceByUser,
  getTodayAttendanceStats,
  insertAttendance,
  listAttendancesByUser,
} from '../db/attendances.js';
import { pool } from '../db/index.js';
import { expireMemberships, findActiveMembership } from '../db/memberships.js';
import { findUserByDocument, findUserById } from '../db/users.js';
import { newId } from '../lib/id.js';
import {
  generateAccessQrToken,
  markTokenAsUsed,
  verifyAccessQrToken,
} from '../lib/qrToken.js';

const DUPLICATE_FACE_THRESHOLD = 0.68;
const ACCESS_FACE_THRESHOLD = 0.62;

function parseEmbedding(data) {
  let parsed = data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed) return null;
  if (!Array.isArray(parsed)) {
    if (typeof parsed === 'object') parsed = Object.values(parsed);
    else return null;
  }
  if (parsed.length > 0 && Array.isArray(parsed[0])) {
    parsed = parsed[0];
  }
  const flat = Array.from(parsed).map(Number);
  if (flat.length === 0 || flat.some((n) => !Number.isFinite(n))) {
    return null;
  }
  return flat;
}

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findBestFaceMatch(rawEmbedding, threshold = ACCESS_FACE_THRESHOLD) {
  const queryEmbedding = parseEmbedding(rawEmbedding);
  if (!queryEmbedding) {
    return { matchedRow: null, highestSimilarity: 0, invalidEmbedding: true };
  }

  const resultQuery = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.tipo_documento, u.numero_documento,
            u.email, u.phone, u.is_active, cf.embedding as facial_embedding
     FROM client_facials cf
     JOIN users u ON cf.user_id = u.id
     WHERE u.role = 'CLIENT'`
  );

  let matchedRow = null;
  let highestSimilarity = 0;

  for (const row of resultQuery.rows) {
    const storedEmbedding = parseEmbedding(row.facial_embedding);
    if (!storedEmbedding || storedEmbedding.length !== queryEmbedding.length) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      matchedRow = row;
    }
  }

  if (!matchedRow || highestSimilarity < threshold) {
    return { matchedRow: null, highestSimilarity, invalidEmbedding: false };
  }

  return { matchedRow, highestSimilarity, invalidEmbedding: false };
}

/**
 * Registra o actualiza el descriptor facial de un cliente (Estrictamente rol CLIENT).
 * POST /api/clients/register-face
 */
export const registerFace = async (req, res) => {
  const { userId, embedding } = req.body;

  try {
    const currentEmbeddingFlat = parseEmbedding(embedding);
    if (!userId || !currentEmbeddingFlat) {
      return res.status(400).json({
        success: false,
        message: 'Descriptor facial inválido.',
      });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
    }

    if (user.role !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El registro facial solo está permitido para clientes.',
      });
    }

    const existingFacesQuery = await pool.query(
      `SELECT user_id, embedding FROM client_facials WHERE user_id != $1`,
      [userId]
    );

    for (const row of existingFacesQuery.rows) {
      if (String(row.user_id) === String(userId)) continue;

      const storedEmbeddingFlat = parseEmbedding(row.embedding);
      if (!storedEmbeddingFlat || storedEmbeddingFlat.length !== currentEmbeddingFlat.length) {
        continue;
      }

      const similarity = cosineSimilarity(currentEmbeddingFlat, storedEmbeddingFlat);
      if (similarity >= DUPLICATE_FACE_THRESHOLD) {
        return res.status(400).json({
          success: false,
          message: 'Este rostro ya se encuentra registrado en el sistema asociado a otra cuenta.',
        });
      }
    }

    await pool.query(
      `INSERT INTO client_facials (user_id, embedding, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
      [userId, JSON.stringify(currentEmbeddingFlat)]
    );

    return res.status(200).json({
      success: true,
      message: 'Registro facial completado con éxito.',
    });
  } catch (error) {
    console.error('Error al registrar rostro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al registrar rostro.',
    });
  }
};

/**
 * Genera el token QR efímero para el cliente autenticado si tiene membresía activa.
 * GET /api/access/my-qr
 */
export const getMyQr = async (req, res) => {
  await expireMemberships();

  const activeMembership = await findActiveMembership(req.user.id);
  if (!activeMembership) {
    return res.status(403).json({
      error: 'No cuentas con una membresía activa para ingresar al gimnasio',
      code: 'NO_ACTIVE_MEMBERSHIP',
    });
  }

  const qrData = generateAccessQrToken({
    userId: req.user.id,
    membershipId: activeMembership.id,
    expiresInSeconds: 90,
  });

  return res.status(200).json({
    token: qrData.token,
    expiresInSeconds: qrData.expiresInSeconds,
    expiresAt: qrData.expiresAt,
    user: {
      id: req.user.id,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      tipo_documento: req.user.tipo_documento,
      numero_documento: req.user.numero_documento,
    },
    membership: {
      id: activeMembership.id,
      planName: activeMembership.plan_name,
      startDate: activeMembership.start_date,
      endDate: activeMembership.end_date,
      status: activeMembership.status,
    },
  });
};

/**
 * Valida el acceso de un cliente mediante token QR, documento manual o Reconocimiento Facial.
 * POST /api/access/validate
 */
export const validateAccess = async (req, res) => {
  const { qrToken, tipo_documento, numero_documento, faceEmbedding } = req.body;

  let userId;
  let entryMethod;
  let tokenJti = null;
  let tokenExp = null;

  if (qrToken) {
    entryMethod = 'qr';
    const verification = verifyAccessQrToken(qrToken);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        status: 'DENIED',
        code: verification.reason,
        error: verification.message,
      });
    }

    userId = verification.payload.uid;
    tokenJti = verification.payload.jti;
    tokenExp = verification.payload.exp;
  } else if (numero_documento) {
    entryMethod = 'acceso_manual';
    const userByDoc = await findUserByDocument(tipo_documento, numero_documento);
    if (!userByDoc) {
      return res.status(404).json({
        success: false,
        status: 'DENIED',
        code: 'USER_NOT_FOUND',
        error: `No se encontró ningún usuario con el documento ${numero_documento}`,
      });
    }
    userId = userByDoc.id;
  } else if (faceEmbedding) {
    entryMethod = 'facial';
    try {
      const { matchedRow, invalidEmbedding } = await findBestFaceMatch(faceEmbedding, ACCESS_FACE_THRESHOLD);
      if (invalidEmbedding) {
        return res.status(400).json({
          success: false,
          status: 'DENIED',
          code: 'INVALID_EMBEDDING',
          error: 'Descriptor facial inválido',
        });
      }
      if (!matchedRow) {
        return res.status(404).json({
          success: false,
          status: 'DENIED',
          code: 'FACE_NOT_RECOGNIZED',
          error: 'Rostro no reconocido',
        });
      }
      userId = matchedRow.id;
    } catch (err) {
      console.error('Error al procesar reconocimiento facial:', err);
      return res.status(500).json({
        success: false,
        status: 'DENIED',
        code: 'SERVER_ERROR',
        error: 'Error al procesar validación facial',
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      status: 'DENIED',
      code: 'MISSING_CREDENTIALS',
      error: 'Debe proporcionar qrToken, numero_documento o faceEmbedding',
    });
  }

  const user = await findUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      status: 'DENIED',
      code: 'USER_NOT_FOUND',
      error: 'Usuario no encontrado',
    });
  }

  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      status: 'DENIED',
      code: 'USER_INACTIVE',
      error: 'La cuenta del usuario se encuentra desactivada',
      client: {
        id: user.id,
        fullName: `${user.first_name} ${user.last_name}`,
        tipo_documento: user.tipo_documento,
        numero_documento: user.numero_documento,
      },
    });
  }

  await expireMemberships();
  const activeMembership = await findActiveMembership(user.id);
  if (!activeMembership) {
    return res.status(403).json({
      success: false,
      status: 'DENIED',
      code: 'NO_ACTIVE_MEMBERSHIP',
      error: 'El cliente no cuenta con una membresía activa',
      client: {
        id: user.id,
        fullName: `${user.first_name} ${user.last_name}`,
        tipo_documento: user.tipo_documento,
        numero_documento: user.numero_documento,
      },
    });
  }

  const todayAttendance = await getTodayAttendanceByUser(user.id);
  const isReentry = Boolean(todayAttendance);

  const attendanceId = newId('att');
  const attendance = await insertAttendance({
    id: attendanceId,
    userId: user.id,
    membershipId: activeMembership.id,
    registeredBy: req.user?.id || null,
    entryMethod,
  });

  if (tokenJti) {
    markTokenAsUsed(tokenJti, tokenExp);
  }

  return res.status(200).json({
    success: true,
    status: 'GRANTED',
    isReentry,
    message: isReentry
      ? 'Reingreso permitido (visita adicional hoy)'
      : 'Acceso concedido',
    attendance: {
      id: attendance.id,
      createdAt: attendance.created_at,
      entryMethod,
    },
    client: {
      id: user.id,
      fullName: `${user.first_name} ${user.last_name}`,
      tipo_documento: user.tipo_documento,
      numero_documento: user.numero_documento,
      email: user.email,
      phone: user.phone,
    },
    membership: {
      id: activeMembership.id,
      planName: activeMembership.plan_name,
      endDate: activeMembership.end_date,
      status: activeMembership.status,
    },
  });
};

/**
 * Identifica al cliente por su rostro y devuelve su estado y membresía.
 * POST /api/access/identify-face
 */
export const identifyFace = async (req, res) => {
  const { faceEmbedding } = req.body;

  try {
    const { matchedRow, invalidEmbedding } = await findBestFaceMatch(faceEmbedding, ACCESS_FACE_THRESHOLD);
    if (invalidEmbedding) {
      return res.status(400).json({ success: false, message: 'Embedding inválido' });
    }

    if (!matchedRow) {
      return res.status(404).json({
        success: false,
        status: 'NOT_FOUND',
        error: 'Persona no identificada',
      });
    }

    if (!matchedRow.is_active) {
      return res.status(403).json({
        success: false,
        status: 'DENIED',
        code: 'USER_INACTIVE',
        error: 'La cuenta del usuario se encuentra desactivada',
        client: {
          id: matchedRow.id,
          fullName: `${matchedRow.first_name} ${matchedRow.last_name}`,
          tipo_documento: matchedRow.tipo_documento,
          numero_documento: matchedRow.numero_documento,
        },
      });
    }

    await expireMemberships();
    const activeMembership = await findActiveMembership(matchedRow.id);

    if (!activeMembership) {
      return res.status(403).json({
        success: false,
        status: 'EXPIRED',
        code: 'NO_ACTIVE_MEMBERSHIP',
        error: 'El cliente no cuenta con una membresía activa o está vencida',
        client: {
          id: matchedRow.id,
          fullName: `${matchedRow.first_name} ${matchedRow.last_name}`,
          tipo_documento: matchedRow.tipo_documento,
          numero_documento: matchedRow.numero_documento,
        },
      });
    }

    return res.status(200).json({
      success: true,
      status: 'IDENTIFIED',
      client: {
        id: matchedRow.id,
        firstName: matchedRow.first_name,
        lastName: matchedRow.last_name,
        tipo_documento: matchedRow.tipo_documento,
        numero_documento: matchedRow.numero_documento,
        email: matchedRow.email,
        phone: matchedRow.phone,
      },
      membership: {
        id: activeMembership.id,
        planName: activeMembership.plan_name,
        endDate: activeMembership.end_date,
        status: activeMembership.status,
      },
    });
  } catch (error) {
    console.error('Error al identificar rostro:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor' });
  }
};

/**
 * Registra formalmente la asistencia cuando se confirma el acceso.
 * POST /api/access/confirm-attendance
 */
export const confirmAttendance = async (req, res) => {
  const { userId, membershipId } = req.body;

  if (!userId || !membershipId) {
    return res.status(400).json({
      success: false,
      error: 'Faltan userId o membershipId para registrar la asistencia',
    });
  }

  try {
    const todayAttendance = await getTodayAttendanceByUser(userId);
    const isReentry = Boolean(todayAttendance);

    const attendanceId = newId('att');
    const attendance = await insertAttendance({
      id: attendanceId,
      userId,
      membershipId,
      registeredBy: req.user?.id || null,
      entryMethod: 'facial',
    });

    return res.status(200).json({
      success: true,
      status: 'GRANTED',
      isReentry,
      message: isReentry ? 'Reingreso permitido (visita adicional hoy)' : 'Acceso concedido exitosamente',
      attendance: {
        id: attendance.id,
        createdAt: attendance.created_at,
      },
    });
  } catch (error) {
    console.error('Error al confirmar asistencia:', error);
    return res.status(500).json({ success: false, error: 'Error al registrar asistencia' });
  }
};

/**
 * Consulta el historial de asistencias del usuario logueado.
 * GET /api/access/my-history
 */
export const getMyHistory = async (req, res) => {
  const query = res.locals.query || req.query || {};
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;

  const attendances = await listAttendancesByUser(req.user.id, { limit, offset });

  return res.status(200).json({
    attendances,
    page,
    limit,
  });
};

/**
 * Estadísticas de afluencia del día para el personal.
 * GET /api/access/today-stats
 */
export const getTodayStats = async (req, res) => {
  const stats = await getTodayAttendanceStats();
  return res.status(200).json({
    totalVisits: stats.total_visits,
    uniqueClients: stats.unique_clients,
    total_visits: stats.total_visits,
    unique_clients: stats.unique_clients,
  });
};