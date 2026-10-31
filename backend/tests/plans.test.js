import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Plans Endpoints (/api/plans)', () => {
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  const createdPlanIds = [];

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;
  });

  afterAll(async () => {
    for (const id of createdPlanIds) {
      await api.delete(`/api/plans/${id}`).set(managerHeaders);
    }
    if (clientUser?.user?.id) {
      await deleteTestUser(clientUser.user.id);
    }
  });

  describe('GET /api/plans (Público)', () => {
    it('Permite listar planes activos sin autenticación', async () => {
      const res = await api.get('/api/plans');

      expect(res.status).toBe(200);
      expect(res.body.plans).toBeInstanceOf(Array);
      // Todos los planes devueltos deben ser activos
      for (const plan of res.body.plans) {
        expect(plan.is_active).toBe(true);
      }
    });
  });

  describe('GET /api/plans/all (Solo Admin/Manager)', () => {
    it('Rechaza la solicitud si no está autenticado (401)', async () => {
      const res = await api.get('/api/plans/all');
      expect(res.status).toBe(401);
    });

    it('Rechaza a un usuario con rol CLIENT (403)', async () => {
      const res = await api.get('/api/plans/all').set(clientHeaders);
      expect(res.status).toBe(403);
    });

    it('Permite al MANAGER listar todos los planes (activos e inactivos)', async () => {
      const res = await api.get('/api/plans/all').set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body.plans).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/plans (Creación de Plan)', () => {
    it('Rechaza la creación si no está autenticado (401)', async () => {
      const res = await api.post('/api/plans').send({
        name: 'Plan No Auth',
        description: 'Test desc',
        price: 50,
        duration_days: 30,
      });
      expect(res.status).toBe(401);
    });

    it('Rechaza la creación si es CLIENT (403)', async () => {
      const res = await api.post('/api/plans').set(clientHeaders).send({
        name: 'Plan Client Auth',
        description: 'Test desc',
        price: 50,
        duration_days: 30,
      });
      expect(res.status).toBe(403);
    });

    it('Rechaza si faltan campos obligatorios (400)', async () => {
      const res = await api.post('/api/plans').set(managerHeaders).send({
        name: 'Plan Incompleto',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('Rechaza precio menor al mínimo permitido de S/ 5.00 (400)', async () => {
      const res = await api.post('/api/plans').set(managerHeaders).send({
        name: `Plan Barato ${Date.now()}`,
        description: 'Test desc',
        price: 2, // Menor a 5
        duration_days: 30,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/S\/ 5\.00/i);
    });

    it('Rechaza duración de días menor o igual a 0 (400)', async () => {
      const res = await api.post('/api/plans').set(managerHeaders).send({
        name: `Plan Duración 0 ${Date.now()}`,
        description: 'Test desc',
        price: 50,
        duration_days: 0,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/mayor a 0 días/i);
    });

    it('Permite al MANAGER crear un plan válido exitosamente (201)', async () => {
      const planName = `Plan Test ${Date.now()}`;
      const res = await api.post('/api/plans').set(managerHeaders).send({
        name: planName,
        description: 'Membresía de prueba para tests automáticos',
        price: 120.5,
        duration_days: 30,
        is_active: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.plan).toBeDefined();
      expect(res.body.plan.name).toBe(planName);
      expect(res.body.plan.price).toBe(120.5);
      expect(res.body.plan.duration_days).toBe(30);

      createdPlanIds.push(res.body.plan.id);
    });

    it('Rechaza nombres de plan duplicados con conflicto (409)', async () => {
      const dupeName = `Plan Dupe ${Date.now()}`;
      const first = await api.post('/api/plans').set(managerHeaders).send({
        name: dupeName,
        description: 'Primer registro',
        price: 60,
        duration_days: 30,
      });
      expect(first.status).toBe(201);
      createdPlanIds.push(first.body.plan.id);

      const second = await api.post('/api/plans').set(managerHeaders).send({
        name: dupeName,
        description: 'Segundo registro duplicado',
        price: 60,
        duration_days: 30,
      });
      expect(second.status).toBe(409);
      expect(second.body.error).toMatch(/ya existe un plan/i);
    });
  });

  describe('GET /api/plans/:id (Detalle de un Plan)', () => {
    it('Retorna 404 para un ID inexistente', async () => {
      const res = await api.get('/api/plans/PLN-noexiste999');
      expect(res.status).toBe(404);
    });

    it('Retorna el detalle de un plan existente', async () => {
      const planName = `Plan Detalle ${Date.now()}`;
      const created = await api.post('/api/plans').set(managerHeaders).send({
        name: planName,
        description: 'Descripción para detalle',
        price: 80,
        duration_days: 15,
      });
      createdPlanIds.push(created.body.plan.id);

      const res = await api.get(`/api/plans/${created.body.plan.id}`);
      expect(res.status).toBe(200);
      expect(res.body.plan.name).toBe(planName);
    });
  });

  describe('PATCH /api/plans/:id (Actualización de Plan)', () => {
    it('Rechaza la actualización si no se envía ningún campo (400)', async () => {
      const planName = `Plan Patch Empty ${Date.now()}`;
      const created = await api.post('/api/plans').set(managerHeaders).send({
        name: planName,
        description: 'Descripción',
        price: 75,
        duration_days: 30,
      });
      createdPlanIds.push(created.body.plan.id);

      const res = await api
        .patch(`/api/plans/${created.body.plan.id}`)
        .set(managerHeaders)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Permite al MANAGER actualizar nombre y precio (200)', async () => {
      const planName = `Plan Para Modificar ${Date.now()}`;
      const created = await api.post('/api/plans').set(managerHeaders).send({
        name: planName,
        description: 'Descripción original',
        price: 75,
        duration_days: 30,
      });
      createdPlanIds.push(created.body.plan.id);

      const res = await api
        .patch(`/api/plans/${created.body.plan.id}`)
        .set(managerHeaders)
        .send({
          name: `${planName} Modificado`,
          price: 99.9,
        });

      expect(res.status).toBe(200);
      expect(res.body.plan.name).toBe(`${planName} Modificado`);
      expect(res.body.plan.price).toBe(99.9);
    });
  });

  describe('DELETE /api/plans/:id (Eliminación de Plan)', () => {
    it('Permite al MANAGER eliminar un plan (200 o 204)', async () => {
      const planName = `Plan Para Eliminar ${Date.now()}`;
      const created = await api.post('/api/plans').set(managerHeaders).send({
        name: planName,
        description: 'Descripción temporal',
        price: 50,
        duration_days: 10,
      });

      const res = await api
        .delete(`/api/plans/${created.body.plan.id}`)
        .set(managerHeaders);

      expect([200, 204]).toContain(res.status);

      // Verificar que ya no existe
      const verify = await api.get(`/api/plans/${created.body.plan.id}`);
      expect(verify.status).toBe(404);
    });

    it('Retorna 404 si se intenta eliminar un plan inexistente', async () => {
      const res = await api
        .delete('/api/plans/PLN-inexistente999')
        .set(managerHeaders);

      expect(res.status).toBe(404);
    });
  });
});
