import { findUserById, findUserByDni } from '../db/users.js';
import { expireMemberships, findActiveMembership } from '../db/memberships.js';
import {
  insertAttendance,
  getTodayAttendanceByUser,
  listAttendancesByUser,
  getTodayAttendanceStats,
} from '../db/attendances.js';
import {
  generateAccessQrToken,
  verifyAccessQrToken,
  markTokenAsUsed,
} from '../lib/qrToken.js';
import { newId } from '../lib/id.js';

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
 * Valida el acceso de un cliente mediante token QR o DNI manual.
 * POST /api/access/validate
 */
export const validateAccess = async (req, res) => {
  const { qrToken, dni } = req.body;

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
    entryMethod = 'manual_dni';
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
    registeredBy: req.user.id,
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
