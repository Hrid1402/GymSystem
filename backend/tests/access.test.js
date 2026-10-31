import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';
import {
  generateAccessQrToken,
  verifyAccessQrToken,
  markTokenAsUsed,
  _resetUsedTokens,
} from '../src/lib/qrToken.js';
import { pool } from '../src/db/index.js';

describe('Access Control & Dynamic QR (/api/access)', () => {
  let managerHeaders;
  let clientWithMembership;
  let clientWithoutMembership;
  let clientHeadersWithMem;
  let clientHeadersWithoutMem;
  let testPlan;
  let activeMembershipId;

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    // Crear cliente 1 (con membresía)
    clientWithMembership = await createTestClientUser();
    clientHeadersWithMem = clientWithMembership.headers;

    // Crear cliente 2 (sin membresía)
    clientWithoutMembership = await createTestClientUser();
    clientHeadersWithoutMem = clientWithoutMembership.headers;

    // Crear plan de prueba
    const planRes = await api.post('/api/plans').set(managerHeaders).send({
      name: `Plan Acceso Test ${Date.now()}`,
      description: 'Plan exclusivo para test de control de acceso',
      price: 80.0,
      duration_days: 30,
      is_active: true,
    });
    testPlan = planRes.body.plan;

    // Inscribir cliente 1 al plan
    const memRes = await api.post('/api/memberships').set(managerHeaders).send({
      user_id: clientWithMembership.user.id,
      plan_id: testPlan.id,
    });
    activeMembershipId = memRes.body.membership.id;
  });

  afterAll(async () => {
    _resetUsedTokens();
    if (activeMembershipId) {
      await pool.query('DELETE FROM attendances WHERE membership_id = $1', [activeMembershipId]);
      await pool.query('DELETE FROM memberships WHERE id = $1', [activeMembershipId]);
    }
    if (testPlan?.id) {
      await api.delete(`/api/plans/${testPlan.id}`).set(managerHeaders);
    }
    if (clientWithMembership?.user?.id) {
      await deleteTestUser(clientWithMembership.user.id);
    }
    if (clientWithoutMembership?.user?.id) {
      await deleteTestUser(clientWithoutMembership.user.id);
    }
  });

  describe('Unidad: Tokens QR Dinámicos (qrToken.js)', () => {
    it('Genera un token firmado con expiración por defecto de 90 segundos', () => {
      const qr = generateAccessQrToken({
        userId: 'usr_test123',
        membershipId: 'mem_test456',
        expiresInSeconds: 90,
      });

      expect(qr.token).toBeDefined();
      expect(typeof qr.token).toBe('string');
      expect(qr.expiresInSeconds).toBe(90);
      expect(qr.expiresAt).toBeDefined();

      const verified = verifyAccessQrToken(qr.token);
      expect(verified.valid).toBe(true);
      expect(verified.payload.uid).toBe('usr_test123');
      expect(verified.payload.mid).toBe('mem_test456');
    });

    it('Rechaza tokens con firma adulterada o manipulada', () => {
      const qr = generateAccessQrToken({ userId: 'usr_orig', membershipId: 'mem_orig' });
      const parts = qr.token.split('.');
      const tamperedToken = `${parts[0]}.firma_invalida_totalmente_falsa`;

      const result = verifyAccessQrToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_SIGNATURE');
    });

    it('Rechaza tokens expirados', () => {
      const expiredQr = generateAccessQrToken({
        userId: 'usr_exp',
        membershipId: 'mem_exp',
        expiresInSeconds: -10, // Expirado en el pasado
      });

      const result = verifyAccessQrToken(expiredQr.token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('QR_EXPIRED');
    });

    it('Protección contra reuso: quema el token después de ser marcado como usado', () => {
      const qr = generateAccessQrToken({ userId: 'usr_anti_replay', membershipId: 'mem_replay' });
      const verified = verifyAccessQrToken(qr.token);
      expect(verified.valid).toBe(true);

      // Simular quema al validar acceso
      markTokenAsUsed(verified.payload.jti, verified.payload.exp);

      // Intento inmediato con el mismo QR (por ejemplo captura de pantalla compartida)
      const secondCheck = verifyAccessQrToken(qr.token);
      expect(secondCheck.valid).toBe(false);
      expect(secondCheck.reason).toBe('QR_ALREADY_USED');
    });
  });

  describe('GET /api/access/my-qr', () => {
    it('Rechaza solicitudes sin autenticación (401)', async () => {
      const res = await api.get('/api/access/my-qr');
      expect(res.status).toBe(401);
    });

    it('Rechaza con 403 a clientes que no tienen membresía activa', async () => {
      const res = await api.get('/api/access/my-qr').set(clientHeadersWithoutMem);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NO_ACTIVE_MEMBERSHIP');
    });

    it('Genera exitosamente el token QR para un cliente con membresía activa (200)', async () => {
      const res = await api.get('/api/access/my-qr').set(clientHeadersWithMem);
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(90);
      expect(res.body.user.id).toBe(clientWithMembership.user.id);
      expect(res.body.membership.id).toBe(activeMembershipId);
    });
  });

  describe('POST /api/access/validate', () => {
    it('Rechaza solicitudes sin autenticación (401)', async () => {
      const res = await api.post('/api/access/validate').send({ dni: '12345678' });
      expect(res.status).toBe(401);
    });

    it('Rechaza a usuarios con rol CLIENT (403, solo RECEPTIONIST/MANAGER)', async () => {
      const res = await api
        .post('/api/access/validate')
        .set(clientHeadersWithMem)
        .send({ dni: '12345678' });
      expect(res.status).toBe(403);
    });

    it('Rechaza payload sin qrToken ni dni (400)', async () => {
      const res = await api.post('/api/access/validate').set(managerHeaders).send({});
      expect(res.status).toBe(400);
    });

    it('Rechaza tokens QR expirados o con firma inválida (400)', async () => {
      const res = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ qrToken: 'token.invalido' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('DENIED');
    });

    it('Permite el acceso con un token QR dinámico válido y registra asistencia (200)', async () => {
      // 1. Cliente genera su QR
      const qrRes = await api.get('/api/access/my-qr').set(clientHeadersWithMem);
      expect(qrRes.status).toBe(200);
      const token = qrRes.body.token;

      // 2. Recepcionista escanea el QR
      const valRes = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ qrToken: token });

      expect(valRes.status).toBe(200);
      expect(valRes.body.success).toBe(true);
      expect(valRes.body.status).toBe('GRANTED');
      expect(valRes.body.isReentry).toBe(false);
      expect(valRes.body.attendance.entryMethod).toBe('qr');
      expect(valRes.body.client.id).toBe(clientWithMembership.user.id);
    });

    it('Rechaza el reuso del mismo token QR quemado (anti-fraude por captura compartida) (400)', async () => {
      // Generar token
      const qrRes = await api.get('/api/access/my-qr').set(clientHeadersWithMem);
      const token = qrRes.body.token;

      // Primer escaneo exitoso
      const scan1 = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ qrToken: token });
      expect(scan1.status).toBe(200);

      // Segundo escaneo inmediato con el mismo QR exacto
      const scan2 = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ qrToken: token });
      expect(scan2.status).toBe(400);
      expect(scan2.body.code).toBe('QR_ALREADY_USED');
    });

    it('Permite acceso mediante DNI manual y detecta reingreso el mismo día (200, isReentry: true)', async () => {
      const res = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ dni: clientWithMembership.dni });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('GRANTED');
      // Ya ingresó previamente en este día en el test anterior
      expect(res.body.isReentry).toBe(true);
      expect(res.body.attendance.entryMethod).toBe('manual_dni');
    });

    it('Rechaza acceso con DNI no registrado (404)', async () => {
      const res = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ dni: '99999999' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('Rechaza acceso por DNI de cliente sin membresía activa (403)', async () => {
      const res = await api
        .post('/api/access/validate')
        .set(managerHeaders)
        .send({ dni: clientWithoutMembership.dni });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NO_ACTIVE_MEMBERSHIP');
    });
  });

  describe('GET /api/access/my-history', () => {
    it('Permite al cliente consultar su historial de asistencias (200)', async () => {
      const res = await api.get('/api/access/my-history').set(clientHeadersWithMem);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.attendances)).toBe(true);
      expect(res.body.attendances.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/access/today-stats', () => {
    it('Permite al personal de administración consultar las estadísticas de afluencia de hoy (200)', async () => {
      const res = await api.get('/api/access/today-stats').set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalVisits');
      expect(res.body).toHaveProperty('uniqueClients');
      expect(res.body.totalVisits).toBeGreaterThanOrEqual(1);
      expect(res.body.uniqueClients).toBeGreaterThanOrEqual(1);
    });
  });
});
