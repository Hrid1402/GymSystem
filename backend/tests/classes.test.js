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
  let specializedClassId;
  let basicClassId;

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
    for (const cid of [testClassId, specializedClassId, basicClassId].filter(Boolean)) {
      await pool.query('DELETE FROM class_enrollments WHERE class_id = $1', [cid]);
      await pool.query('DELETE FROM classes WHERE id = $1', [cid]);
    }
    if (clientUser?.user?.id) await deleteTestUser(clientUser.user);
    if (trainerUser?.user?.id) await deleteTestUser(trainerUser.user);
    if (otherTrainerUser?.user?.id) await deleteTestUser(otherTrainerUser.user);
    await closeDb();
  });

  it('permite al GERENTE crear una clase semanal asignando al entrenador', async () => {
    const res = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        nombre_clase: 'Spinning Pro Mañana',
        descripcion: 'Clase intensa de cardio y resistencia',
        entrenador_id: trainerUser.user.id,
        sala: 'Sala 2',
        dia_semana: 2, // Martes
        hora_inicio: '10:00',
        hora_fin: '11:00',
        cupo_maximo: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body.class).toBeDefined();
    expect(res.body.class.nombre_clase).toBe('Spinning Pro Mañana');
    expect(res.body.class.dia_semana).toBe(2);
    expect(res.body.class.proxima_fecha).toBeDefined();
    expect(res.body.class.entrenador_id).toBe(trainerUser.user.id);
    testClassId = res.body.class.id;
  });

  it('rechaza conflicto de horario en el mismo día de la semana y sala (409)', async () => {
    const res = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        nombre_clase: 'Choque Horario',
        descripcion: 'Conflicto en Sala 2 los martes',
        entrenador_id: otherTrainerUser.user.id,
        sala: 'Sala 2',
        dia_semana: 2,
        hora_inicio: '10:30',
        hora_fin: '11:30',
        cupo_maximo: 10,
      });

    expect(res.status).toBe(409);
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
         VALUES ($1, $2, (SELECT id FROM plans WHERE nivel_clases = 'todas' LIMIT 1), 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')`,
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

    it('retorna nivel_clases y today_enrolled_classes al escanear QR del cliente vía /api/users/:id/trainer-lookup', async () => {
      const res = await api
        .get(`/api/users/${clientUser.user.id}/trainer-lookup`)
        .set(trainerUser.headers);

      expect(res.status).toBe(200);
      expect(res.body.client).toBeDefined();
      expect(res.body.membership).toBeDefined();
      expect(['ninguna', 'basicas', 'todas']).toContain(res.body.membership.nivel_clases);
      expect(Array.isArray(res.body.today_enrolled_classes)).toBe(true);
    });

    it('rechaza con 403 si el plan del cliente no incluye acceso a clases (nivel_clases = ninguna)', async () => {
      await pool.query(
        `UPDATE memberships SET plan_id = (SELECT id FROM plans WHERE nivel_clases = 'ninguna' LIMIT 1) WHERE id = $1`,
        [testMembershipId]
      );

      const res = await api
        .post(`/api/classes/${testClassId}/enroll`)
        .set(clientUser.headers);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/no incluye acceso a clases/i);
    });

    it('permite clases básicas y rechaza clases especializadas (403) cuando nivel_clases = basicas', async () => {
      const catalogRes = await api.get('/api/classes/catalog').set(manager.headers);
      expect(catalogRes.status).toBe(200);
      const basicCat = catalogRes.body.catalog.find((c) => c.categoria === 'basica');
      const specCat = catalogRes.body.catalog.find((c) => c.categoria === 'especializada');
      expect(basicCat).toBeDefined();
      expect(specCat).toBeDefined();

      const createBasicRes = await api
        .post('/api/classes')
        .set(manager.headers)
        .send({
          catalog_id: basicCat.id,
          entrenador_id: trainerUser.user.id,
          sala: 'Sala 4',
          dia_semana: 4,
          hora_inicio: '17:00',
          hora_fin: '18:00',
          cupo_maximo: 15,
        });
      expect(createBasicRes.status).toBe(201);
      basicClassId = createBasicRes.body.class.id;
      expect(createBasicRes.body.class.categoria).toBe('basica');

      const createSpecRes = await api
        .post('/api/classes')
        .set(manager.headers)
        .send({
          catalog_id: specCat.id,
          entrenador_id: trainerUser.user.id,
          sala: 'Sala 5',
          dia_semana: 5,
          hora_inicio: '18:00',
          hora_fin: '19:00',
          cupo_maximo: 15,
        });
      expect(createSpecRes.status).toBe(201);
      specializedClassId = createSpecRes.body.class.id;
      expect(createSpecRes.body.class.categoria).toBe('especializada');

      await pool.query(
        `UPDATE memberships SET plan_id = (SELECT id FROM plans WHERE nivel_clases = 'basicas' LIMIT 1) WHERE id = $1`,
        [testMembershipId]
      );

      const enrollBasicRes = await api
        .post(`/api/classes/${basicClassId}/enroll`)
        .set(clientUser.headers);
      expect(enrollBasicRes.status).toBe(201);

      const enrollSpecRes = await api
        .post(`/api/classes/${specializedClassId}/enroll`)
        .set(clientUser.headers);
      expect(enrollSpecRes.status).toBe(403);
      expect(enrollSpecRes.body.error).toMatch(/acceso completo a clases/i);
    });

    it('permite al GERENTE crear, editar y eliminar una disciplina del catálogo', async () => {
      const createRes = await api
        .post('/api/classes/catalog')
        .set(manager.headers)
        .send({ nombre: 'Pilates Test', categoria: 'basica' });
      expect(createRes.status).toBe(201);
      const itemId = createRes.body.item.id;

      const updateRes = await api
        .patch(`/api/classes/catalog/${itemId}`)
        .set(manager.headers)
        .send({ categoria: 'especializada', is_active: false });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.item.categoria).toBe('especializada');
      expect(updateRes.body.item.is_active).toBe(false);

      const deleteRes = await api
        .delete(`/api/classes/catalog/${itemId}`)
        .set(manager.headers);
      expect(deleteRes.status).toBe(204);
    });
  });
});
