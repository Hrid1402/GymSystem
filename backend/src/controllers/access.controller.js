import {
  getTodayAttendanceByUser,
  getTodayAttendanceStats,
  insertAttendance,
  listAttendancesByUser,
} from '../db/attendances.js';
import { pool } from '../db/index.js';
import { expireMemberships, findActiveMembership } from '../db/memberships.js';
import { findUserByDni, findUserById } from '../db/users.js';
import { newId } from '../lib/id.js';
import {
  generateAccessQrToken,
  markTokenAsUsed,
  verifyAccessQrToken,
} from '../lib/qrToken.js';

// Función auxiliar para calcular la similitud de coseno entre vectores faciales
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

/**
 * Registra o actualiza el descriptor facial de un cliente (Estrictamente rol CLIENT).
 * POST /api/clients/register-face
 */
export const registerFace = async (req, res) => {
  const { userId, embedding } = req.body;

  try {
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Descriptor facial inválido.'
      });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    if (user.role !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: El registro facial solo está permitido para clientes.'
      });
    }

    // 1. OBTENER TODOS LOS ROSTROS EXISTENTES
    const existingFacesQuery = await pool.query(
      `SELECT user_id, embedding FROM client_facials WHERE user_id != $1`,
      [userId]
    );

    const parseEmbedding = (data) => {
      let parsed = data;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { return null; }
      }
      if (!parsed) return null;
      if (!Array.isArray(parsed)) {
        if (typeof parsed === 'object') parsed = Object.values(parsed);
        else return null;
      }
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        parsed = parsed[0];
      }
      const flat = Array.from(parsed).map(Number).filter(n => !isNaN(n));
      return flat.length > 0 ? flat : null;
    };

    const currentEmbeddingFlat = parseEmbedding(embedding);
    console.log(`[DEBUG] Embedding actual aplanado longitud:`, currentEmbeddingFlat?.length);

    if (!currentEmbeddingFlat) {
      return res.status(400).json({ success: false, message: 'Formato de descriptor facial actual inválido.' });
    }

    const THRESHOLD = 0.40; // Umbral muy bajo temporalmente para forzar detección

    for (const row of existingFacesQuery.rows) {
      const storedEmbeddingFlat = parseEmbedding(row.embedding);
      

      if (!storedEmbeddingFlat) {
        continue;
      }

      if (storedEmbeddingFlat.length !== currentEmbeddingFlat.length) {
        continue;
      }

      const similarity = cosineSimilarity(currentEmbeddingFlat, storedEmbeddingFlat);

      if (similarity >= THRESHOLD) {
        return res.status(400).json({
          success: false,
          message: 'Este rostro ya se encuentra registrado en el sistema asociado a otra cuenta.'
        });
      }
    }

    // Si pasa la validación, procedemos con normalidad
    await pool.query('DELETE FROM client_facials WHERE user_id = $1', [userId]);

    await pool.query(
      `INSERT INTO client_facials (user_id, embedding, updated_at)
       VALUES ($1, $2, NOW())`,
      [userId, JSON.stringify(embedding)]
    );

    return res.status(200).json({
      success: true,
      message: 'Registro facial completado con éxito.'
    });
  } catch (error) {
    console.error('Error al registrar rostro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al registrar rostro.'
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
      dni: req.user.dni,
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
 * Valida el acceso de un cliente mediante token QR, DNI manual o Reconocimiento Facial.
 * POST /api/access/validate
 */
export const validateAccess = async (req, res) => {
  const { qrToken, dni, faceEmbedding } = req.body;

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
  } else if (dni) {
    entryMethod = 'dni';
    const userByDni = await findUserByDni(dni);
    if (!userByDni) {
      return res.status(404).json({
        success: false,
        status: 'DENIED',
        code: 'USER_NOT_FOUND',
        error: `No se encontró ningún usuario con el DNI ${dni}`,
      });
    }
    userId = userByDni.id;
  } else if (faceEmbedding) {
    entryMethod = 'facial';
    try {
      // Buscar exclusivamente entre rostros vinculados a usuarios con rol CLIENT
      const resultQuery = await pool.query(
        `SELECT u.id, cf.embedding as facial_embedding
         FROM client_facials cf
         JOIN users u ON cf.user_id = u.id
         WHERE u.role = 'CLIENT'`
      );

      let matchedUserId = null;
      let highestSimilarity = 0;
      const THRESHOLD = 0.52;

      for (const row of resultQuery.rows) {
        let storedEmbedding;
        try {
          storedEmbedding = typeof row.facial_embedding === 'string'
            ? JSON.parse(row.facial_embedding)
            : row.facial_embedding;
        } catch (e) {
          continue;
        }

        if (!Array.isArray(storedEmbedding)) continue;

        const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          matchedUserId = row.id;
        }
      }

      if (!matchedUserId || highestSimilarity < THRESHOLD) {
        return res.status(404).json({
          success: false,
          status: 'DENIED',
          code: 'FACE_NOT_RECOGNIZED',
          error: 'Rostro no reconocido',
        });
      }

      userId = matchedUserId;
    } catch (err) {
      console.error('Error al procesar reconocimiento facial:', err);
      return res.status(500).json({
        success: false,
        status: 'DENIED',
        code: 'SERVER_ERROR',
        error: 'Error al procesar validación facial',
      });
    }
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
        dni: user.dni,
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
        dni: user.dni,
      },
    });
  }

  // Comprobar reingreso
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

  // Si fue por QR, quemar el token para prevenir reuso inmediato
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
      dni: user.dni,
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
 * Identifica al cliente por su rostro y devuelve su estado y membresía (Sin registrar asistencia aún).
 * POST /api/access/identify-face
 */
export const identifyFace = async (req, res) => {
  const { faceEmbedding } = req.body;

  try {
    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res.status(400).json({ success: false, message: 'Embedding inválido' });
    }

    const resultQuery = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.dni, u.email, u.phone, u.is_active,
              cf.embedding as facial_embedding
       FROM client_facials cf
       JOIN users u ON cf.user_id = u.id
       WHERE u.role = 'CLIENT'`
    );

    let matchedUser = null;
    let highestSimilarity = 0;
    const THRESHOLD = 0.52;

    for (const row of resultQuery.rows) {
      let storedEmbedding;
      try {
        storedEmbedding = typeof row.facial_embedding === 'string' 
          ? JSON.parse(row.facial_embedding) 
          : row.facial_embedding;
      } catch (e) {
        console.error('Error al parsear embedding almacenado para usuario:', row.id);
        continue;
      }

      if (!Array.isArray(storedEmbedding)) continue;

      const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        matchedUser = row;
      }
    }

    if (!matchedUser || highestSimilarity < THRESHOLD) {
      return res.status(404).json({
        success: false,
        status: 'NOT_FOUND',
        error: 'Persona no identificada',
      });
    }

    if (!matchedUser.is_active) {
      return res.status(403).json({
        success: false,
        status: 'DENIED',
        code: 'USER_INACTIVE',
        error: 'La cuenta del usuario se encuentra desactivada',
        client: { id: matchedUser.id, fullName: `${matchedUser.first_name} ${matchedUser.last_name}`, dni: matchedUser.dni }
      });
    }

    await expireMemberships();
    const activeMembership = await findActiveMembership(matchedUser.id);
    
    if (!activeMembership) {
      return res.status(403).json({
        success: false,
        status: 'EXPIRED',
        code: 'NO_ACTIVE_MEMBERSHIP',
        error: 'El cliente no cuenta con una membresía activa o está vencida',
        client: { id: matchedUser.id, fullName: `${matchedUser.first_name} ${matchedUser.last_name}`, dni: matchedUser.dni }
      });
    }

    return res.status(200).json({
      success: true,
      status: 'IDENTIFIED',
      client: {
        id: matchedUser.id,
        firstName: matchedUser.first_name,
        lastName: matchedUser.last_name,
        dni: matchedUser.dni,
        email: matchedUser.email,
        phone: matchedUser.phone,
      },
      membership: {
        id: activeMembership.id,
        planName: activeMembership.plan_name,
        endDate: activeMembership.end_date,
        status: activeMembership.status,
      }
    });

  } catch (error) {
    console.error('Error al identificar rostro:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor' });
  }
};

/**
 * Registra formalmente la asistencia cuando la recepcionista hace clic en "Registrar Acceso".
 * POST /api/access/confirm-attendance
 */
export const confirmAttendance = async (req, res) => {
  const { userId, membershipId } = req.body;

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
      }
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
 * Estadísticas de afluencia del día para el personal (recepción/administración).
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