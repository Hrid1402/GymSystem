import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Memberships Endpoints (/api/memberships)', () => {
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  let testPlan;
  const createdMembershipIds = [];

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;

    // Crear un plan temporal para pruebas de membresía
    const planRes = await api.post('/api/plans').set(managerHeaders).send({
      name: `Plan Membresía Test ${Date.now()}`,
      description: 'Plan exclusivo para tests de membresía',
      price: 99.9,
      duration_days: 30,
      is_active: true,
    });
    testPlan = planRes.body.plan;
  });

  afterAll(async () => {
    if (testPlan?.id) {
      await api.delete(`/api/plans/${testPlan.id}`).set(managerHeaders);
    }
    if (clientUser?.user?.supabase_user_id) {
      await deleteTestUser(clientUser.user.supabase_user_id);
    }
  });

  describe('GET /api/memberships/me', () => {
    it('Rechaza a usuarios no autenticados (401)', async () => {
      const res = await api.get('/api/memberships/me');
      expect(res.status).toBe(401);
    });

    it('Permite a un CLIENT autenticado consultar su historial de membresías (200)', async () => {
      const res = await api.get('/api/memberships/me').set(clientHeaders);
      expect(res.status).toBe(200);
      expect(res.body.memberships).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/memberships (Staff/Manager)', () => {
    it('Rechaza a usuarios con rol CLIENT (403)', async () => {
      const res = await api.get('/api/memberships').set(clientHeaders);
      expect(res.status).toBe(403);
    });

    it('Permite al MANAGER listar todas las membresías del gimnasio (200)', async () => {
      const res = await api.get('/api/memberships').set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body.memberships).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/memberships (Inscripción)', () => {
    it('Rechaza si no se envía plan_id (400)', async () => {
      const res = await api.post('/api/memberships').set(managerHeaders).send({
        user_id: clientUser.user.id,
      });
      expect(res.status).toBe(400);
    });

    it('Retorna 404 si el plan_id no existe', async () => {
      const res = await api.post('/api/memberships').set(managerHeaders).send({
        plan_id: 'PLN-inexistente999',
        user_id: clientUser.user.id,
      });
      expect(res.status).toBe(404);
    });

    it('Permite al MANAGER inscribir directamente a un cliente (201)', async () => {
      const res = await api.post('/api/memberships').set(managerHeaders).send({
        plan_id: testPlan.id,
        user_id: clientUser.user.id,
      });

      expect(res.status).toBe(201);
      expect(res.body.membership).toBeDefined();
      expect(res.body.membership.user_id).toBe(clientUser.user.id);
      expect(res.body.membership.status).toBe('ACTIVE');

      createdMembershipIds.push(res.body.membership.id);
    });

    it('Rechaza inscribir a un cliente si ya cuenta con una membresía activa (409)', async () => {
      const res = await api.post('/api/memberships').set(managerHeaders).send({
        plan_id: testPlan.id,
        user_id: clientUser.user.id,
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/activa/i);
    });
  });

  describe('PATCH /api/memberships/:id/cancel', () => {
    it('Retorna 404 para un ID de membresía inexistente', async () => {
      const res = await api
        .patch('/api/memberships/MEM-noexiste999/cancel')
        .set(managerHeaders);
      expect(res.status).toBe(404);
    });

    it('Permite cancelar la membresía activa del cliente (200)', async () => {
      const membershipId = createdMembershipIds[0];
      if (!membershipId) return;

      const res = await api
        .patch(`/api/memberships/${membershipId}/cancel`)
        .set(managerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.membership.status).toBe('CANCELLED');
    });
  });
});
