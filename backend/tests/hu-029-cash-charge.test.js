import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  authenticate: vi.fn(),
  findStaff: vi.fn(),
  findClient: vi.fn(),
  findPlan: vi.fn(),
  expireMemberships: vi.fn(),
  findActiveMembership: vi.fn(),
  insertMembership: vi.fn(),
  createPayment: vi.fn(),
  issueInvoice: vi.fn(),
}));

vi.mock('../src/lib/culqi.js', () => ({ culqi: {} }));
vi.mock('../src/lib/supabaseClient.js', () => ({
  supabase: { auth: { getUser: dependencies.authenticate } },
}));
vi.mock('../src/db/users.js', () => ({
  findUserById: dependencies.findClient,
  findUserBySupabaseId: dependencies.findStaff,
}));
vi.mock('../src/db/plans.js', () => ({ findPlanById: dependencies.findPlan }));
vi.mock('../src/db/memberships.js', () => ({
  expireMemberships: dependencies.expireMemberships,
  findActiveMembership: dependencies.findActiveMembership,
  insertMembership: dependencies.insertMembership,
}));
vi.mock('../src/db/payments.js', () => ({
  createCashPaymentRecord: dependencies.createPayment,
}));
vi.mock('../src/services/invoices.service.js', () => ({
  issueInvoiceForPayment: dependencies.issueInvoice,
}));

import payments from '../src/routes/payments.routes.js';

const app = express();
app.use(express.json());
app.use('/api/payments', payments);
app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Error al registrar el cobro' }));

const client = { id: 'USR-pedro', role: 'CLIENT', is_active: true };
const plan = { id: 'PLN-mensual', name: 'Mensual', price: '60.00', duration_days: 30, is_active: true };
const selection = { client_id: client.id, plan_id: plan.id };
const roles = new Set(['MANAGER', 'RECEPTIONIST', 'CLIENT', 'TRAINER']);

function charge(role, body = selection) {
  const call = request(app).post('/api/payments/cash-charge');
  if (role) call.set('Authorization', 'Bearer ' + role);
  return call.send(body);
}

describe('HU-029 · Cobro en efectivo en recepción', () => {
  const memberships = [];
  const recordedPayments = [];

  beforeEach(() => {
    vi.resetAllMocks();
    memberships.length = 0;
    recordedPayments.length = 0;
    dependencies.authenticate.mockImplementation(async (token) => ({
      data: { user: roles.has(token) ? { id: token } : null },
    }));
    dependencies.findStaff.mockImplementation(async (id) => ({ id, role: id, is_active: true }));
    dependencies.findClient.mockResolvedValue(client);
    dependencies.findPlan.mockResolvedValue(plan);
    dependencies.findActiveMembership.mockImplementation(async () => memberships[0] ?? null);
    dependencies.insertMembership.mockImplementation(async ({ id, userId, planId }) => {
      // El doble reproduce la unicidad del almacenamiento. La restricción real requiere una prueba con PostgreSQL.
      if (memberships.length) throw Object.assign(new Error('Membresía duplicada'), { code: '23505' });
      const membership = { id, user_id: userId, plan_id: planId, status: 'ACTIVE', end_date: '2026-12-24' };
      memberships.push(membership);
      return membership;
    });
    dependencies.createPayment.mockImplementation(async (payment) => {
      recordedPayments.push(payment);
      return { id: payment.id, membership_id: payment.membershipId, amount: payment.amount };
    });
  });

  it.each(['MANAGER', 'RECEPTIONIST'])('CP-01 · %s registra un pago vinculado a la membresía', async (role) => {
    const res = await charge(role);
    expect(res.status).toBe(201);
    expect(res.body.payment.membership_id).toBe(res.body.membership.id);
    expect(res.body.membership.status).toBe('ACTIVE');
    expect(dependencies.insertMembership).toHaveBeenCalledWith(
      expect.objectContaining({ userId: client.id, planId: plan.id, durationDays: 30 }),
    );
    expect(recordedPayments).toEqual([
      expect.objectContaining({ amount: 60, currencyId: 'PEN', registeredBy: role }),
    ]);
  });

  it('CP-02 · rechaza un segundo cobro con membresía activa', async () => {
    expect((await charge('MANAGER')).status).toBe(201);
    expect((await charge('RECEPTIONIST')).status).toBe(409);
    expect(memberships).toHaveLength(1);
    expect(recordedPayments).toHaveLength(1);
  });

  it('CP-03 · rechaza un plan desactivado', async () => {
    dependencies.findPlan.mockResolvedValue({ ...plan, is_active: false });
    expect((await charge('RECEPTIONIST')).status).toBe(404);
    expect(dependencies.insertMembership).not.toHaveBeenCalled();
    expect(recordedPayments).toHaveLength(0);
  });

  it('CP-04 · rechaza un cliente desactivado', async () => {
    dependencies.findClient.mockResolvedValue({ ...client, is_active: false });
    expect((await charge('RECEPTIONIST')).status).toBe(400);
    expect(dependencies.insertMembership).not.toHaveBeenCalled();
    expect(recordedPayments).toHaveLength(0);
  });

  it.each([{ client_id: client.id }, { plan_id: plan.id }])('CP-05 · rechaza selección incompleta: %j', async (body) => {
    expect((await charge('RECEPTIONIST', body)).status).toBe(400);
    expect(dependencies.insertMembership).not.toHaveBeenCalled();
    expect(recordedPayments).toHaveLength(0);
  });

  it('CP-07 · transmite S/ 6,00 y duración de un día', async () => {
    dependencies.findPlan.mockResolvedValue({ ...plan, price: '6.00', duration_days: 1 });
    expect((await charge('RECEPTIONIST')).status).toBe(201);
    expect(recordedPayments[0].amount).toBe(6);
    expect(dependencies.insertMembership).toHaveBeenCalledWith(expect.objectContaining({ durationDays: 1 }));
  });

  it('CP-06 · procesa el vencimiento antes de buscar una membresía activa', async () => {
    let previousStatus = 'ACTIVE';
    dependencies.expireMemberships.mockImplementation(async () => { previousStatus = 'EXPIRED'; });
    dependencies.findActiveMembership.mockImplementation(async () =>
      previousStatus === 'ACTIVE' ? { id: 'MEM-anterior', end_date: '2026-11-25' } : null,
    );

    expect((await charge('RECEPTIONIST')).status).toBe(201);
    expect(previousStatus).toBe('EXPIRED');
    expect(recordedPayments[0].membershipId).toBe(memberships[0].id);
  });

  it('CP-08 · maneja dos confirmaciones antes de que alguna vea la membresía', async () => {
    let releaseLookups;
    const bothRead = new Promise((resolve) => { releaseLookups = resolve; });
    let reads = 0;
    dependencies.findActiveMembership.mockImplementation(async () => {
      reads += 1;
      if (reads > 2) return memberships[0];
      if (reads === 2) releaseLookups();
      await bothRead;
      return null;
    });

    const results = await Promise.all([charge('MANAGER'), charge('RECEPTIONIST')]);
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(dependencies.insertMembership).toHaveBeenCalledTimes(2);
    expect(memberships).toHaveLength(1);
    expect(recordedPayments).toHaveLength(1);
    expect(recordedPayments[0].membershipId).toBe(memberships[0].id);
  });

  it('CP-09 · exige autenticación', async () => {
    expect((await charge(null)).status).toBe(401);
    expect(dependencies.insertMembership).not.toHaveBeenCalled();
  });

  it.each(['CLIENT', 'TRAINER'])('CP-10 · deniega el cobro a %s', async (role) => {
    expect((await charge(role)).status).toBe(403);
    expect(dependencies.insertMembership).not.toHaveBeenCalled();
  });

  // Fallo conocido: retirar .fails cuando ambos registros se guarden en una sola transacción.
  it.fails('CP-12 · si falla el pago, no queda una membresía activa', async () => {
    dependencies.createPayment.mockRejectedValueOnce(new Error('Fallo simulado al persistir el pago'));
    expect((await charge('RECEPTIONIST')).status).toBe(500);
    expect(recordedPayments).toHaveLength(0);
    expect(memberships).toHaveLength(0);
  });
});
