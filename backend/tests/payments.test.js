import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Payments Endpoints (/api/payments)', () => {
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  let testPlan;

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;

    // Crear un plan temporal para pruebas de pagos
    const planRes = await api.post('/api/plans').set(managerHeaders).send({
      name: `Plan Pagos Test ${Date.now()}`,
      description: 'Plan exclusivo para tests de pagos',
      price: 150,
      duration_days: 30,
      is_active: true,
    });
    testPlan = planRes.body.plan;
  });

  afterAll(async () => {
    if (testPlan?.id) {
      await api.delete(`/api/plans/${testPlan.id}`).set(managerHeaders);
    }
    if (clientUser?.user?.id) {
      await deleteTestUser(clientUser.user.id);
    }
  });

  describe('POST /api/payments/create-preference (Mercado Pago Checkout Pro)', () => {
    it('Rechaza a usuarios no autenticados (401)', async () => {
      const res = await api.post('/api/payments/create-preference').send({
        plan_id: testPlan.id,
      });
      expect(res.status).toBe(401);
    });

    it('Rechaza a usuarios que no son CLIENT (ej. MANAGER) con 403', async () => {
      const res = await api
        .post('/api/payments/create-preference')
        .set(managerHeaders)
        .send({
          plan_id: testPlan.id,
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/clientes activos/i);
    });

    it('Rechaza si no se envía plan_id (400)', async () => {
      const res = await api
        .post('/api/payments/create-preference')
        .set(clientHeaders)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Retorna 404 si el plan_id no existe', async () => {
      const res = await api
        .post('/api/payments/create-preference')
        .set(clientHeaders)
        .send({
          plan_id: 'PLN-inexistente999',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no encontrado/i);
    });
  });

  describe('GET /api/payments/me', () => {
    it('Rechaza a usuarios no autenticados (401)', async () => {
      const res = await api.get('/api/payments/me');
      expect(res.status).toBe(401);
    });

    it('Permite a un CLIENT autenticado consultar su historial de pagos (200)', async () => {
      const res = await api.get('/api/payments/me').set(clientHeaders);
      expect(res.status).toBe(200);
      expect(res.body.payments).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('Retorna 404 para un pago inexistente', async () => {
      const res = await api
        .get('/api/payments/PAY-inexistente999')
        .set(clientHeaders);
      expect(res.status).toBe(404);
    });
  });
});
