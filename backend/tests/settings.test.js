import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/index.js';
import { api, closeDb, createTestClientUser, deleteTestUser, getManagerAuth } from './helpers.js';

describe('Gym Settings & Onboarding API (/api/settings)', () => {
  let manager;
  let clientUser;
  let trainerUser;
  let createdClassId;
  let previousSettingsRow = null;

  beforeAll(async () => {
    const prev = await pool.query("SELECT * FROM gym_settings WHERE id = 'default' LIMIT 1");
    previousSettingsRow = prev.rows[0] || null;

    await pool.query("DELETE FROM gym_settings WHERE id = 'default'");

    manager = await getManagerAuth();
    clientUser = await createTestClientUser();

    const trainerEmail = `trainer_cfg_${Date.now()}@gymtest.com`;
    const trainerDni = String(Math.floor(10000000 + Math.random() * 90000000));
    const trainerRes = await api
      .post('/api/users')
      .set(manager.headers)
      .send({
        email: trainerEmail,
        password: 'TrainerPassword123!',
        first_name: 'Luis',
        last_name: 'Salas',
        role: 'TRAINER',
        tipo_documento: 'dni',
        numero_documento: trainerDni,
        phone: '987654321',
        date_of_birth: '1991-03-10',
        specialty: 'Funcional',
      });
    expect(trainerRes.status).toBe(201);
    trainerUser = trainerRes.body.user;
  });

  afterAll(async () => {
    if (createdClassId) {
      await pool.query('DELETE FROM classes WHERE id = $1', [createdClassId]);
    }
    if (clientUser?.user?.id) await deleteTestUser(clientUser.user);
    if (trainerUser?.id) await deleteTestUser(trainerUser);

    await pool.query("DELETE FROM gym_settings WHERE id = 'default'");
    if (previousSettingsRow) {
      await pool.query(
        `INSERT INTO gym_settings (
           id, max_capacity, total_rooms, opening_time, closing_time,
           is_configured, terms_accepted_at, configured_by, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          previousSettingsRow.id,
          previousSettingsRow.max_capacity,
          previousSettingsRow.total_rooms,
          previousSettingsRow.opening_time,
          previousSettingsRow.closing_time,
          previousSettingsRow.is_configured,
          previousSettingsRow.terms_accepted_at,
          previousSettingsRow.configured_by,
          previousSettingsRow.updated_at,
        ]
      );
    }

    await closeDb();
  });

  it('retorna defaults con isConfigured=false antes del onboarding', async () => {
    const res = await api.get('/api/settings').set(manager.headers);
    expect(res.status).toBe(200);
    expect(res.body.settings.isConfigured).toBe(false);
    expect(res.body.settings.totalRooms).toBe(5);
  });

  it('rechaza onboarding si no se aceptan términos (400)', async () => {
    const res = await api
      .post('/api/settings/onboarding')
      .set(manager.headers)
      .send({
        acceptTerms: false,
        maxCapacity: 40,
        totalRooms: 3,
        openingTime: '07:00',
        closingTime: '21:00',
      });
    expect(res.status).toBe(400);
  });

  it('permite al GERENTE completar el onboarding inicial (200) y bloquea repetirlo (409)', async () => {
    const res = await api
      .post('/api/settings/onboarding')
      .set(manager.headers)
      .send({
        acceptTerms: true,
        maxCapacity: 60,
        totalRooms: 3,
        openingTime: '07:00',
        closingTime: '21:00',
      });
    expect(res.status).toBe(200);
    expect(res.body.settings.isConfigured).toBe(true);
    expect(res.body.settings.maxCapacity).toBe(60);
    expect(res.body.settings.totalRooms).toBe(3);
    expect(res.body.settings.openingTime).toBe('07:00');
    expect(res.body.settings.closingTime).toBe('21:00');

    const repeatRes = await api
      .post('/api/settings/onboarding')
      .set(manager.headers)
      .send({
        acceptTerms: true,
        maxCapacity: 50,
        totalRooms: 2,
        openingTime: '08:00',
        closingTime: '20:00',
      });
    expect(repeatRes.status).toBe(409);
  });

  it('deniega a CLIENT modificar configuración (403)', async () => {
    const res = await api
      .put('/api/settings')
      .set(clientUser.headers)
      .send({
        maxCapacity: 80,
        totalRooms: 4,
        openingTime: '06:00',
        closingTime: '22:00',
      });
    expect(res.status).toBe(403);
  });

  it('rechaza crear clase en sala inexistente (Sala 4 cuando totalRooms=3) o fuera de horario (400)', async () => {
    const catalogRes = await api.get('/api/classes/catalog').set(manager.headers);
    const catId = catalogRes.body.catalog[0].id;

    const badRoomRes = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        catalog_id: catId,
        entrenador_id: trainerUser.id,
        sala: 'Sala 4',
        dia_semana: 1,
        hora_inicio: '08:00',
        hora_fin: '09:00',
        cupo_maximo: 15,
      });
    expect(badRoomRes.status).toBe(400);
    expect(badRoomRes.body.error).toMatch(/sala/i);

    const badHourRes = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        catalog_id: catId,
        entrenador_id: trainerUser.id,
        sala: 'Sala 3',
        dia_semana: 1,
        hora_inicio: '06:00',
        hora_fin: '07:00',
        cupo_maximo: 15,
      });
    expect(badHourRes.status).toBe(400);
    expect(badHourRes.body.error).toMatch(/horario de atención/i);

    const okRes = await api
      .post('/api/classes')
      .set(manager.headers)
      .send({
        catalog_id: catId,
        entrenador_id: trainerUser.id,
        sala: 'Sala 3',
        dia_semana: 3,
        hora_inicio: '19:00',
        hora_fin: '20:00',
        cupo_maximo: 15,
      });
    expect(okRes.status).toBe(201);
    createdClassId = okRes.body.class.id;

    // Impide reducir salas a 2 mientras haya clase activa en Sala 3
    const reduceConflictRes = await api
      .put('/api/settings')
      .set(manager.headers)
      .send({
        maxCapacity: 60,
        totalRooms: 2,
        openingTime: '07:00',
        closingTime: '21:00',
      });
    expect(reduceConflictRes.status).toBe(409);
  });
});
