import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/index.js';
import { newId } from '../src/lib/id.js';
import { api, closeDb, createTestClientUser, deleteTestUser, getManagerAuth } from './helpers.js';

describe('Classes & Trainer Management API (/api/classes)', () => {
  let manager;
  let clientUser;
  let trainerUser;
  let otherTrainerUser;
  let testClassId;

  beforeAll(async () => {
    manager = await getManagerAuth();
    clientUser = await createTestClientUser();

    // Crear dos entrenadores de prueba
    const trainerEmail = `trainer_${Date.now()}@gymtest.com`;
    const trainerDni = String(Math.floor(10000000 + Math.random() * 90000000));
    const trainerCreateRes = await api
      .post('/api/users')
      .set(manager.headers)
      .send({
        email: trainerEmail,
        password: 'TrainerPassword123!',
        first_name: 'Carlos',
        last_name: 'Entrenador',
        role: 'TRAINER',
        tipo_documento: 'dni',
        numero_documento: trainerDni,
        phone: '987111222',
        date_of_birth: '1990-05-15',
        specialty: 'Spinning y Cardio',
      });

    expect(trainerCreateRes.status).toBe(201);
    const trainerDbUser = trainerCreateRes.body.user;

    const trainerLoginRes = await api
      .post('/api/auth/login')
      .send({ email: trainerEmail, password: 'TrainerPassword123!' });

    trainerUser = {
      user: trainerDbUser,
      token: trainerLoginRes.body.access_token,
      headers: { Authorization: `Bearer ${trainerLoginRes.body.access_token}` },
    };

    // Crear un segundo entrenador para pruebas de aislamiento
    const otherTrainerEmail = `other_trainer_${Date.now()}@gymtest.com`;
    const otherTrainerDni = String(Math.floor(10000000 + Math.random() * 90000000));
    const otherTrainerRes = await api
      .post('/api/users')
      .set(manager.headers)
      .send({
        email: otherTrainerEmail,
        password: 'OtherPassword123!',
        first_name: 'Marcos',
        last_name: 'Trainer',
        role: 'TRAINER',
        tipo_documento: 'dni',
        numero_documento: otherTrainerDni,
        phone: '987333444',
        date_of_birth: '1992-08-20',
        specialty: 'Crossfit',
      });

    const otherTrainerDbUser = otherTrainerRes.body.user;
    const otherLoginRes = await api
      .post('/api/auth/login')
      .send({ email: otherTrainerEmail, password: 'OtherPassword123!' });

    otherTrainerUser = {
      user: otherTrainerDbUser,
      token: otherLoginRes.body.access_token,
      headers: { Authorization: `Bearer ${otherLoginRes.body.access_token}` },
    };
  });

  afterAll(async () => {
    if (testClassId) {
      await pool.query('DELETE FROM class_enrollments WHERE class_id = $1', [testClassId]);
      await pool.query('DELETE FROM classes WHERE id = $1', [testClassId]);
    }
    if (clientUser?.user?.id) await deleteTestUser(clientUser.user);
    if (trainerUser?.user?.id) await deleteTestUser(trainerUser.user);
    if (otherTrainerUser?.user?.id) await deleteTestUser(otherTrainerUser.user);
    await closeDb();
  });

  it('permite al GERENTE crear una clase asignando al entrenador', async () => {
    // Calculamos una fecha futura para no caer en error de fecha pasada
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().slice(0, 10);

    const res = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        nombre_clase: 'Spinning Pro Mañana',
        descripcion: 'Clase intensa de cardio y resistencia',
        entrenador_id: trainerUser.user.id,
        sala: 'Sala 2',
        fecha_clase: dateStr,
        hora_inicio: '10:00',
        hora_fin: '11:00',
        cupo_maximo: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body.class).toBeDefined();
    expect(res.body.class.nombre_clase).toBe('Spinning Pro Mañana');
    expect(res.body.class.entrenador_id).toBe(trainerUser.user.id);
    testClassId = res.body.class.id;
  });

  it('permite al ENTRENADOR listar las clases vía GET /api/classes', async () => {
    const res = await api
      .get('/api/classes')
      .set(trainerUser.headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.classes)).toBe(true);
    const found = res.body.classes.find((c) => c.id === testClassId);
    expect(found).toBeDefined();
    expect(found.entrenador_id).toBe(trainerUser.user.id);
  });

  it('permite al CLIENTE listar las clases vía GET /api/classes', async () => {
    const res = await api
      .get('/api/classes')
      .set(clientUser.headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.classes)).toBe(true);
  });

  it('rechaza con 401 el listado de clases sin token', async () => {
    const res = await api.get('/api/classes');
    expect(res.status).toBe(401);
  });

  it('permite al ENTRENADOR consultar la lista de alumnos inscritos de su propia clase', async () => {
    const res = await api
      .get(`/api/classes/${testClassId}/enrollments`)
      .set(trainerUser.headers);

    expect(res.status).toBe(200);
    expect(res.body.class).toBeDefined();
    expect(Array.isArray(res.body.enrollments)).toBe(true);
  });

  it('permite al GERENTE consultar la lista de alumnos inscritos de cualquier clase', async () => {
    const res = await api
      .get(`/api/classes/${testClassId}/enrollments`)
      .set(manager.headers);

    expect(res.status).toBe(200);
    expect(res.body.class).toBeDefined();
    expect(Array.isArray(res.body.enrollments)).toBe(true);
  });

  it('rechaza con 403 a un ENTRENADOR que intente ver los inscritos de una clase que NO le pertenece', async () => {
    const res = await api
      .get(`/api/classes/${testClassId}/enrollments`)
      .set(otherTrainerUser.headers);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no tienes permiso/i);
  });

  it('rechaza con 403 a un CLIENTE que intente acceder a /api/classes/:id/enrollments', async () => {
    const res = await api
      .get(`/api/classes/${testClassId}/enrollments`)
      .set(clientUser.headers);

    expect(res.status).toBe(403);
  });

  describe('Inscripción y Cancelación de Reserva por el Cliente', () => {
    let testMembershipId;

    beforeAll(async () => {
      testMembershipId = newId('MEM');
      await pool.query(
        `INSERT INTO memberships (id, user_id, plan_id, status, start_date, end_date)
         VALUES ($1, $2, (SELECT id FROM plans LIMIT 1), 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')`,
        [testMembershipId, clientUser.user.id]
      );
    });

    afterAll(async () => {
      if (testMembershipId) {
        await pool.query('DELETE FROM memberships WHERE id = $1', [testMembershipId]);
      }
    });

    it('permite al CLIENTE inscribirse a una clase activa (201)', async () => {
      const res = await api
        .post(`/api/classes/${testClassId}/enroll`)
        .set(clientUser.headers);

      expect(res.status).toBe(201);
      expect(res.body.class).toBeDefined();
      expect(res.body.class.ya_inscrito).toBe(true);
      expect(res.body.class.inscritos_actuales).toBe(1);
    });

    it('permite al CLIENTE cancelar su reserva de clase vía DELETE /api/classes/:id/enroll (200)', async () => {
      const res = await api
        .delete(`/api/classes/${testClassId}/enroll`)
        .set(clientUser.headers);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reserva cancelada/i);
      expect(res.body.class.ya_inscrito).toBe(false);
      expect(res.body.class.inscritos_actuales).toBe(0);
    });

    it('rechaza con 409 cuando el CLIENTE intenta cancelar una reserva en la que no está inscrito', async () => {
      const res = await api
        .delete(`/api/classes/${testClassId}/enroll`)
        .set(clientUser.headers);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/no estás inscrito/i);
    });

    it('rechaza con 401 cancelar reserva sin autenticación', async () => {
      const res = await api.delete(`/api/classes/${testClassId}/enroll`);
      expect(res.status).toBe(401);
    });
  });
});
