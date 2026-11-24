import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';
import { pool } from '../src/db/index.js';

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
    if (clientUser?.user?.id) {
      await pool.query('DELETE FROM invoices WHERE user_id = $1', [clientUser.user.id]);
      await pool.query('DELETE FROM payments WHERE user_id = $1', [clientUser.user.id]);
      await pool.query('DELETE FROM memberships WHERE user_id = $1', [clientUser.user.id]);
      await deleteTestUser(clientUser.user.id);
    }
    if (testPlan?.id) {
      await pool.query('DELETE FROM invoices WHERE payment_id IN (SELECT id FROM payments WHERE plan_id = $1)', [testPlan.id]);
      await pool.query('DELETE FROM payments WHERE plan_id = $1', [testPlan.id]);
      await pool.query('DELETE FROM memberships WHERE plan_id = $1', [testPlan.id]);
      await pool.query('DELETE FROM plans WHERE id = $1', [testPlan.id]);
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

  describe('POST /api/payments/cash-charge (Cobro Presencial en Efectivo)', () => {
    let secondClientUser;

    afterAll(async () => {
      if (secondClientUser?.user?.id) {
        await pool.query('DELETE FROM invoices WHERE user_id = $1', [secondClientUser.user.id]);
        await pool.query('DELETE FROM payments WHERE user_id = $1', [secondClientUser.user.id]);
        await pool.query('DELETE FROM memberships WHERE user_id = $1', [secondClientUser.user.id]);
        await deleteTestUser(secondClientUser.user.id);
      }
    });

    it('Rechaza a usuarios no autenticados (401)', async () => {
      const res = await api.post('/api/payments/cash-charge').send({
        client_id: clientUser.user.id,
        plan_id: testPlan.id,
      });
      expect(res.status).toBe(401);
    });

    it('Rechaza a usuarios con rol CLIENT (403)', async () => {
      const res = await api
        .post('/api/payments/cash-charge')
        .set(clientHeaders)
        .send({
          client_id: clientUser.user.id,
          plan_id: testPlan.id,
        });
      expect(res.status).toBe(403);
    });

    it('Rechaza si falta el client_id o plan_id (400)', async () => {
      const res = await api
        .post('/api/payments/cash-charge')
        .set(managerHeaders)
        .send({
          client_id: clientUser.user.id,
        });
      expect(res.status).toBe(400);
    });

    it('Permite al personal (MANAGER) registrar un cobro en efectivo y activa membresía (201)', async () => {
      const res = await api
        .post('/api/payments/cash-charge')
        .set(managerHeaders)
        .send({
          client_id: clientUser.user.id,
          plan_id: testPlan.id,
          billing_details: {
            tipo_doc: '03',
            num_doc: clientUser.dni,
            rzn_social: 'CLIENTE TEST EFECTIVO',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.status).toBe('approved');
      expect(res.body.payment.payment_method_id).toBe('EFECTIVO');
      expect(Number(res.body.payment.amount)).toBe(150);
      expect(res.body.membership).toBeDefined();
      expect(res.body.membership.status).toBe('ACTIVE');
    });

    it('Rechaza con 409 si el cliente ya cuenta con membresía activa (prevención anti-duplicados)', async () => {
      const res = await api
        .post('/api/payments/cash-charge')
        .set(managerHeaders)
        .send({
          client_id: clientUser.user.id,
          plan_id: testPlan.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/membresía activa/i);
    });
  });

  describe('GET /api/payments/daily-summary (Arqueo y Resumen Diario de Caja)', () => {
    it('Rechaza a usuarios con rol CLIENT (403)', async () => {
      const res = await api.get('/api/payments/daily-summary').set(clientHeaders);
      expect(res.status).toBe(403);
    });

    it('Permite al MANAGER consultar el resumen de caja del día (200)', async () => {
      const res = await api.get('/api/payments/daily-summary').set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(typeof res.body.summary.cash_total).toBe('number');
      expect(typeof res.body.summary.cash_count).toBe('number');
      expect(typeof res.body.summary.online_total).toBe('number');
      expect(typeof res.body.summary.total_revenue).toBe('number');
      expect(res.body.summary.cash_count).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.cash_total).toBeGreaterThanOrEqual(150);
    });
  });
});
