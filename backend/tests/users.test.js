import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Users Endpoints (/api/users)', () => {
  let managerAuth;
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  const createdTestUserIds = [];

  beforeAll(async () => {
    managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;
  });

  afterAll(async () => {
    for (const id of createdTestUserIds) {
      await deleteTestUser(id);
    }
    if (clientUser?.user?.id) {
      await deleteTestUser(clientUser.user.id);
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
        tipo_documento: 'dni',
        numero_documento: String(Math.floor(10000000 + Math.random() * 90000000)),
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
        tipo_documento: 'dni',
        numero_documento: uniqueDni,
        phone: '987654321',
        date_of_birth: '1992-05-10',
        role: 'RECEPTIONIST',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('RECEPTIONIST');

      if (res.body.user?.id) {
        createdTestUserIds.push(res.body.user.id);
      }
    });

    it('Permite al MANAGER crear un usuario con rol CLIENT (201)', async () => {
      const uniqueDni = String(Math.floor(10000000 + Math.random() * 90000000));
      const email = `client_admin_${Date.now()}@starkfit.com`;

      const res = await api.post('/api/users').set(managerHeaders).send({
        email,
        password: 'Password123!',
        first_name: 'ClienteAdmin',
        last_name: 'Prueba',
        tipo_documento: 'dni',
        numero_documento: uniqueDni,
        phone: '987654321',
        date_of_birth: '1995-08-20',
        role: 'CLIENT',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('CLIENT');

      if (res.body.user?.id) {
        createdTestUserIds.push(res.body.user.id);
      }
    });
  });

  describe('PATCH /api/users/:id (Edición por el Manager)', () => {
    it('Rechaza la actualización si no se envía ningún campo (400)', async () => {
      const res = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({});

      expect(res.status).toBe(400);
    });

    it('Permite al MANAGER actualizar datos personales (nombre, teléfono y fecha de nacimiento) (200)', async () => {
      const res = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({
          first_name: 'NombreActualizado',
          last_name: 'ApellidoActualizado',
          phone: '912345678',
          date_of_birth: '1996-03-22',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.first_name).toBe('NombreActualizado');
      expect(res.body.user.last_name).toBe('ApellidoActualizado');
      expect(res.body.user.phone).toBe('912345678');
      expect(res.body.user.date_of_birth).toMatch(/1996-03-22/);
    });

    it('Permite al MANAGER actualizar el rol de otro usuario (200)', async () => {
      const res = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({
          role: 'RECEPTIONIST',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('RECEPTIONIST');

      // Revertir a CLIENT
      await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({ role: 'CLIENT' });
    });

    it('Permite al MANAGER suspender/desactivar y luego reactivar una cuenta (is_active)', async () => {
      // 1. Desactivar cuenta
      const deactRes = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({
          is_active: false,
        });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.user.is_active).toBe(false);

      // 2. Intentar loguearse con la cuenta desactivada -> Debe rechazar con 403
      const loginAttempt = await api.post('/api/auth/login').send({
        email: clientUser.email,
        password: clientUser.password,
      });
      expect(loginAttempt.status).toBe(403);
      expect(loginAttempt.body.error).toMatch(/desactivada/i);

      // 3. Reactivar la cuenta
      const reactRes = await api
        .patch(`/api/users/${clientUser.user.id}`)
        .set(managerHeaders)
        .send({
          is_active: true,
        });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.user.is_active).toBe(true);

      // 4. Ahora sí puede iniciar sesión
      const loginSuccess = await api.post('/api/auth/login').send({
        email: clientUser.email,
        password: clientUser.password,
      });
      expect(loginSuccess.status).toBe(200);
    });

    it('Rechaza que el MANAGER se desactive o cambie de rol a sí mismo (403)', async () => {
      const resRole = await api
        .patch(`/api/users/${managerAuth.user.id}`)
        .set(managerHeaders)
        .send({
          role: 'CLIENT',
        });
      expect(resRole.status).toBe(403);

      const resActive = await api
        .patch(`/api/users/${managerAuth.user.id}`)
        .set(managerHeaders)
        .send({
          is_active: false,
        });
      expect(resActive.status).toBe(403);
    });

    it('Rechaza actualizar el documento si ya pertenece a otro usuario (409)', async () => {
      // El documento de clientUser ya existe, intentamos asignárselo a otro usuario
      const otherUser = await createTestClientUser();
      if (otherUser?.user?.id) {
        createdTestUserIds.push(otherUser.user.id);
      }

      const res = await api
        .patch(`/api/users/${otherUser.user.id}`)
        .set(managerHeaders)
        .send({
          numero_documento: clientUser.numero_documento,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/documento/i);
    });

    it('Rechaza si un CLIENT intenta actualizar el perfil de otro usuario (403)', async () => {
      const res = await api
        .patch(`/api/users/${managerAuth.user.id}`)
        .set(clientHeaders)
        .send({
          first_name: 'HackerName',
        });

      expect(res.status).toBe(403);
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
