import crypto from 'node:crypto';

const QR_SECRET = process.env.QR_SECRET || process.env.SUPABASE_JWT_SECRET || 'gym_system_qr_default_secure_secret_2026';

// Memoria volátil para tokens quemados / protección contra reuso (replay attacks)
// Almacena Map<jti, expTimestamp>
const usedTokens = new Map();

export const purgeExpiredTokens = () => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of usedTokens.entries()) {
    if (exp <= now) {
      usedTokens.delete(jti);
    }
  }
};

/**
 * Genera un token QR dinámico firmado con HMAC-SHA256 y expiración breve (por defecto 90s).
 */
export const generateAccessQrToken = ({ userId, membershipId, expiresInSeconds = 90 }) => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;
  const jti = crypto.randomUUID();

  const payload = {
    uid: userId,
    mid: membershipId,
    jti,
    iat: now,
    exp,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const token = `${encodedPayload}.${signature}`;

  return {
    token,
    expiresInSeconds,
    expiresAt: new Date(exp * 1000).toISOString(),
    jti,
  };
};

/**
 * Verifica la firma y expiración de un token QR.
 */
export const verifyAccessQrToken = (token) => {
  purgeExpiredTokens();

  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'INVALID_FORMAT', message: 'Formato de código QR inválido' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'INVALID_FORMAT', message: 'Formato de código QR inválido' };
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'INVALID_SIGNATURE', message: 'Firma de código QR inválida o manipulada' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'INVALID_PAYLOAD', message: 'Contenido del código QR ilegible' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return { valid: false, reason: 'QR_EXPIRED', message: 'El código QR ha expirado. Por favor genera o actualiza uno nuevo.' };
  }

  if (payload.jti && usedTokens.has(payload.jti)) {
    return { valid: false, reason: 'QR_ALREADY_USED', message: 'Este código QR ya fue utilizado. Por favor genera uno nuevo.' };
  }

  return {
    valid: true,
    payload,
  };
};

/**
 * Registra un token como utilizado para prevenir reutilización inmediata.
 */
export const markTokenAsUsed = (jti, exp) => {
  if (jti) {
    usedTokens.set(jti, exp || (Math.floor(Date.now() / 1000) + 90));
  }
};

/**
 * Limpia el registro de tokens usados (útil para pruebas unitarias).
 */
export const _resetUsedTokens = () => {
  usedTokens.clear();
};
