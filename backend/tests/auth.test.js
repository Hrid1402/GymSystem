import { describe, it, expect, afterAll } from 'vitest';
import { api, getManagerAuth, deleteTestUser } from './helpers.js';

describe('Auth Endpoints (/api/auth)', () => {
  const createdTestUserIds = [];

  afterAll(async () => {
    for (const id of createdTestUserIds) {
      await deleteTestUser(id);
    }
  });

  describe('POST /api/auth/register', () => {
    it('Registra exitosamente un cliente con datos válidos', async () => {
      const uniqueDni = String(Math.floor(10000000 + Math.random() * 90000000));
      const email = `reg_test_${Date.now()}@starkfit.com`;

      const res = await api.post('/api/auth/register').send({
        email,
        password: 'Password123!',
        first_name: 'Juan',
        last_name: 'Pérez',
        dni: uniqueDni,
        phone: '987654321',
        date_of_birth: '1995-06-15',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('CLIENT');
      expect(res.body.user.dni).toBe(uniqueDni);

      if (res.body.user?.id) {
        createdTestUserIds.push(res.body.user.id);
      }
    });

    it('Rechaza el registro si faltan campos obligatorios', async () => {
      const res = await api.post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThanOrEqual(4);
    });

    it('Rechaza un formato de correo electrónico inválido', async () => {
      const res = await api.post('/api/auth/register').send({
        email: 'correo-invalido',
        password: 'Password123!',
        first_name: 'Ana',
        last_name: 'Gómez',
        dni: '12345678',
        date_of_birth: '1995-06-15',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/email/i);
    });

    it('Rechaza contraseñas menores a 8 caracteres', async () => {
      const res = await api.post('/api/auth/register').send({
        email: `short_pwd_${Date.now()}@starkfit.com`,
        password: '123',
        first_name: 'Ana',
        last_name: 'Gómez',
        dni: '12345678',
        date_of_birth: '1995-06-15',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/8/i);
    });

    it('Rechaza DNI que no contenga exactamente 8 dígitos numéricos', async () => {
      const resLetters = await api.post('/api/auth/register').send({
        email: `bad_dni1_${Date.now()}@starkfit.com`,
        password: 'Password123!',
        first_name: 'Ana',
        last_name: 'Gómez',
        dni: '1234ABCD',
        date_of_birth: '1995-06-15',
      });
      expect(resLetters.status).toBe(400);

      const resShort = await api.post('/api/auth/register').send({
        email: `bad_dni2_${Date.now()}@starkfit.com`,
        password: 'Password123!',
        first_name: 'Ana',
        last_name: 'Gómez',
        dni: '12345',
        date_of_birth: '1995-06-15',
      });
      expect(resShort.status).toBe(400);
    });

    it('Rechaza a menores de 18 años (debe ser mayor de edad)', async () => {
      // Fecha de hace 16 años
      const sixteenYearsAgo = new Date();
      sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16);
      const dobString = sixteenYearsAgo.toISOString().split('T')[0];

      const res = await api.post('/api/auth/register').send({
        email: `minor_${Date.now()}@starkfit.com`,
        password: 'Password123!',
        first_name: 'Menor',
        last_name: 'Prueba',
        dni: String(Math.floor(10000000 + Math.random() * 90000000)),
        date_of_birth: dobString,
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/18 años/i);
    });

    it('Rechaza el registro con correo duplicado (409)', async () => {
      const email = `dupe_${Date.now()}@starkfit.com`;
      const dni1 = String(Math.floor(10000000 + Math.random() * 90000000));
      const dni2 = String(Math.floor(10000000 + Math.random() * 90000000));

      const first = await api.post('/api/auth/register').send({
        email,
        password: 'Password123!',
        first_name: 'Primero',
        last_name: 'Usuario',
        dni: dni1,
        date_of_birth: '1990-01-01',
      });
      expect(first.status).toBe(201);
      if (first.body.user?.id) {
        createdTestUserIds.push(first.body.user.id);
      }

      const second = await api.post('/api/auth/register').send({
        email,
        password: 'Password123!',
        first_name: 'Segundo',
        last_name: 'Usuario',
        dni: dni2,
        date_of_birth: '1990-01-01',
      });
      expect(second.status).toBe(409);
      expect(second.body.error).toMatch(/correo electrónico/i);
    });

    it('Rechaza el registro con DNI duplicado (409)', async () => {
      const sharedDni = String(Math.floor(10000000 + Math.random() * 90000000));
      const email1 = `dni1_${Date.now()}@starkfit.com`;
      const email2 = `dni2_${Date.now()}@starkfit.com`;

      const first = await api.post('/api/auth/register').send({
        email: email1,
        password: 'Password123!',
        first_name: 'Primero',
        last_name: 'Usuario',
        dni: sharedDni,
        date_of_birth: '1990-01-01',
      });
      expect(first.status).toBe(201);
      if (first.body.user?.id) {
        createdTestUserIds.push(first.body.user.id);
      }

      const second = await api.post('/api/auth/register').send({
        email: email2,
        password: 'Password123!',
        first_name: 'Segundo',
        last_name: 'Usuario',
        dni: sharedDni,
        date_of_birth: '1990-01-01',
      });
      expect(second.status).toBe(409);
      expect(second.body.error).toMatch(/DNI/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('Inicia sesión exitosamente con credenciales válidas del Manager', async () => {
      const res = await api.post('/api/auth/login').send({
        email: process.env.INITIAL_MANAGER_EMAIL,
        password: process.env.INITIAL_MANAGER_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('MANAGER');
    });

    it('Rechaza el inicio de sesión sin contraseña o sin correo (400)', async () => {
      const resEmpty = await api.post('/api/auth/login').send({});
      expect(resEmpty.status).toBe(400);

      const resNoPwd = await api.post('/api/auth/login').send({
        email: 'test@starkfit.com',
      });
      expect(resNoPwd.status).toBe(400);
    });

    it('Rechaza credenciales erróneas con 401', async () => {
      const res = await api.post('/api/auth/login').send({
        email: process.env.INITIAL_MANAGER_EMAIL,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('Rechaza usuarios no registrados con 401', async () => {
      const res = await api.post('/api/auth/login').send({
        email: 'usuario_inexistente_9999@starkfit.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('Retorna la información del usuario autenticado', async () => {
      const managerAuth = await getManagerAuth();

      const res = await api
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${managerAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(process.env.INITIAL_MANAGER_EMAIL);
      expect(res.body.user.role).toBe('MANAGER');
    });

    it('Rechaza solicitudes sin token (401)', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('Rechaza solicitudes con token malformado o falso (401)', async () => {
      const res = await api
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_invalido_12345');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('Acepta solicitud de recuperación para formato de correo válido (200)', async () => {
      const res = await api.post('/api/auth/forgot-password').send({
        email: 'cualquiera@starkfit.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('Rechaza formato de correo inválido (400)', async () => {
      const res = await api.post('/api/auth/forgot-password').send({
        email: 'no-es-correo',
      });

      expect(res.status).toBe(400);
    });
  });
});
