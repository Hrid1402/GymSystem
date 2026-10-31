import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Users Endpoints (/api/users)', () => {
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  const createdTestUserIds = [];

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;
  });

  afterAll(async () => {
    for (const id of createdTestUserIds) {
      await deleteTestUser(id);
    }
    if (clientUser?.user?.supabase_user_id) {
      await deleteTestUser(clientUser.user.supabase_user_id);
    }
  });

  describe('GET /api/users', () => {
    it('Rechaza a usuarios no autenticados (401)', async () => {
      const res = await api.get('/api/users');
      expect(res.status).toBe(401);
    });

    it('Rechaza a usuarios con rol CLIENT (403)', async () => {
      const res = await api.get('/api/users').set(clientHeaders);
      expect(res.status).toBe(403);
    });

    it('Permite al MANAGER obtener el listado de usuarios (200)', async () => {
      const res = await api.get('/api/users').set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('Retorna 404 para un usuario inexistente', async () => {
      const res = await api.get('/api/users/USR-noexiste999').set(managerHeaders);
      expect(res.status).toBe(404);
    });

    it('Permite a un CLIENT consultar su propio perfil', async () => {
      const res = await api.get(`/api/users/${clientUser.user.id}`).set(clientHeaders);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(clientUser.user.id);
    });

    it('Permite al MANAGER consultar el perfil de cualquier usuario', async () => {
      const res = await api.get(`/api/users/${clientUser.user.id}`).set(managerHeaders);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(clientUser.user.id);
    });
  });

  describe('POST /api/users (Creación administrativa)', () => {
    it('Rechaza la creación si no está autenticado (401)', async () => {
      const res = await api.post('/api/users').send({
        email: 'sin_auth@starkfit.com',
      });
      expect(res.status).toBe(401);
    });

    it('Rechaza la creación si es CLIENT (403)', async () => {
      const res = await api.post('/api/users').set(clientHeaders).send({
        email: 'client_trying@starkfit.com',
      });
      expect(res.status).toBe(403);
    });

    it('Rechaza roles inexistentes o no permitidos (400)', async () => {
      const res = await api.post('/api/users').set(managerHeaders).send({
        email: `bad_role_${Date.now()}@starkfit.com`,
        password: 'Password123!',
        first_name: 'Carlos',
        last_name: 'Pérez',
        dni: String(Math.floor(10000000 + Math.random() * 90000000)),
        date_of_birth: '1990-01-01',
        role: 'SUPERADMIN', // Rol inválido
      });
      expect(res.status).toBe(400);
    });

    it('Permite al MANAGER crear un usuario con rol RECEPTIONIST (201)', async () => {
      const uniqueDni = String(Math.floor(10000000 + Math.random() * 90000000));
      const email = `recep_${Date.now()}@starkfit.com`;

      const res = await api.post('/api/users').set(managerHeaders).send({
        email,
        password: 'Password123!',
        first_name: 'Recepcionista',
        last_name: 'Prueba',
        dni: uniqueDni,
        phone: '987654321',
        date_of_birth: '1992-05-10',
        role: 'RECEPTIONIST',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('RECEPTIONIST');

      if (res.body.user.supabase_user_id) {
        createdTestUserIds.push(res.body.user.supabase_user_id);
      }
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('Rechaza la actualización si no se envía ningún campo (400)', async () => {
      const res = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Permite al MANAGER actualizar campos del usuario (200)', async () => {
      const res = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({
          first_name: 'NombreActualizado',
          phone: '912345678',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.first_name).toBe('NombreActualizado');
      expect(res.body.user.phone).toBe('912345678');
    });

    it('Retorna 404 si se intenta actualizar un usuario inexistente', async () => {
      const res = await api
        .patch('/api/users/USR-noexiste999')
        .set(managerHeaders)
        .send({
          first_name: 'Invalido',
        });

      expect(res.status).toBe(404);
    });
  });
});
