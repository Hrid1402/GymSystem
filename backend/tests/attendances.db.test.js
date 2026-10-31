import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';
import { pool } from '../src/db/index.js';
import { newId } from '../src/lib/id.js';
import {
  insertAttendance,
  findAttendanceById,
  getTodayAttendanceByUser,
  listAttendancesByUser,
  getTodayAttendanceStats,
} from '../src/db/attendances.js';

describe('Attendances DB Queries (/src/db/attendances.js)', () => {
  let managerAuth;
  let clientUser;
  let testPlan;
  let testMembership;

  beforeAll(async () => {
    managerAuth = await getManagerAuth();
    clientUser = await createTestClientUser();

    // Crear un plan para la prueba
    const planRes = await api.post('/api/plans').set(managerAuth.headers).send({
      name: `Plan Attendances Test ${Date.now()}`,
      description: 'Plan para probar tabla attendances',
      price: 99,
      duration_days: 30,
      is_active: true,
    });
    testPlan = planRes.body.plan;

    // Crear una membresía activa para el cliente de prueba
    const memRes = await api.post('/api/memberships').set(managerAuth.headers).send({
      plan_id: testPlan.id,
      user_id: clientUser.user.id,
    });
    testMembership = memRes.body.membership;
  });

  afterAll(async () => {
    if (clientUser?.user?.id) {
      await pool.query('DELETE FROM attendances WHERE user_id = $1', [clientUser.user.id]);
      await pool.query('DELETE FROM memberships WHERE user_id = $1', [clientUser.user.id]);
    }
    if (testPlan?.id) {
      await api.delete(`/api/plans/${testPlan.id}`).set(managerAuth.headers);
    }
    if (clientUser?.user?.id) {
      await deleteTestUser(clientUser.user.id);
    }
  });

  it('Inserta un ingreso (attendance) correctamente en la base de datos', async () => {
    const attendanceId = newId('ATT');
    const record = await insertAttendance({
      id: attendanceId,
      userId: clientUser.user.id,
      membershipId: testMembership.id,
      registeredBy: managerAuth.user.id,
    });

    expect(record).toBeDefined();
    expect(record.id).toBe(attendanceId);
    expect(record.user_id).toBe(clientUser.user.id);
    expect(record.dni).toBe(clientUser.dni);
    expect(record.plan_name).toBe(testPlan.name);
    expect(record.created_at).toBeDefined();
  });

  it('Detecta si el cliente ya ingresó hoy (getTodayAttendanceByUser)', async () => {
    const todayRecord = await getTodayAttendanceByUser(clientUser.user.id);

    expect(todayRecord).toBeDefined();
    expect(todayRecord.user_id).toBe(clientUser.user.id);
  });

  it('Lista el historial de asistencias de un cliente', async () => {
    const history = await listAttendancesByUser(clientUser.user.id);

    expect(history).toBeInstanceOf(Array);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].user_id).toBe(clientUser.user.id);
  });

  it('Calcula las estadísticas del día (total_visits y unique_clients)', async () => {
    const stats = await getTodayAttendanceStats();

    expect(stats).toBeDefined();
    expect(typeof stats.total_visits).toBe('number');
    expect(typeof stats.unique_clients).toBe('number');
    expect(stats.total_visits).toBeGreaterThanOrEqual(1);
    expect(stats.unique_clients).toBeGreaterThanOrEqual(1);
  });
});
