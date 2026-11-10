import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getManagerAuth, createTestClientUser, deleteTestUser } from './helpers.js';

describe('Invoices & Electronic Billing Endpoints (/api/invoices)', () => {
  let managerHeaders;
  let clientHeaders;
  let clientUser;
  let testPlan;
  let createdInvoiceId;

  beforeAll(async () => {
    const managerAuth = await getManagerAuth();
    managerHeaders = managerAuth.headers;

    clientUser = await createTestClientUser();
    clientHeaders = clientUser.headers;

    const planRes = await api.post('/api/plans').set(managerHeaders).send({
      name: `Plan Facturación Test ${Date.now()}`,
      description: 'Plan para tests de facturación electrónica SUNAT',
      price: 118, // S/ 118.00 -> Base S/ 100.00, IGV S/ 18.00
      duration_days: 30,
      is_active: true,
    });
    testPlan = planRes.body.plan;
  });

  afterAll(async () => {
    if (testPlan?.id) {
      await api.delete(`/api/plans/${testPlan.id}`).set(managerHeaders);
    }
    if (clientUser?.user?.id) {
      await deleteTestUser(clientUser.user.id);
    }
  });

  describe('Emisión de comprobante en /api/payments/charge', () => {
    it('Genera Boleta de Venta (B001) tras cobro exitoso con desglose de IGV', async () => {
      const res = await api
        .post('/api/payments/charge')
        .set(clientHeaders)
        .send({
          plan_id: testPlan.id,
          token_id: 'mock_token_test_123',
          billing_details: {
            tipo_doc: '03',
            num_doc: '40112233',
            rzn_social: 'JUAN PEREZ TEST',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.membership).toBeDefined();
      expect(res.body.payment).toBeDefined();

      const invoice = res.body.invoice;
      expect(invoice).toBeDefined();
      expect(invoice.tipo_doc).toBe('03');
      expect(invoice.serie).toBe('B001');
      expect(invoice.correlativo).toBeGreaterThanOrEqual(1);
      expect(Number(invoice.total_venta)).toBe(118);
      expect(Number(invoice.mto_oper_gravadas)).toBe(100);
      expect(Number(invoice.mto_igv)).toBe(18);

      createdInvoiceId = invoice.id;
    });
  });

  describe('Consulta y Descarga de Comprobantes', () => {
    it('Permite al cliente listar sus comprobantes emitidos (200)', async () => {
      const res = await api.get('/api/invoices/my').set(clientHeaders);
      expect(res.status).toBe(200);
      expect(res.body.invoices).toBeInstanceOf(Array);
      expect(res.body.invoices.length).toBeGreaterThanOrEqual(1);

      const inv = res.body.invoices.find((i) => i.id === createdInvoiceId);
      expect(inv).toBeDefined();
      expect(inv.serie).toBe('B001');
    });

    it('Descarga la representación impresa en PDF del comprobante (200 application/pdf)', async () => {
      const res = await api.get(`/api/invoices/${createdInvoiceId}/pdf`).set(clientHeaders);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.body).toBeDefined();
    });

    it('Retorna 404 para un comprobante inexistente', async () => {
      const res = await api.get('/api/invoices/INV-inexistente/pdf').set(clientHeaders);
      expect(res.status).toBe(404);
    });
  });
});
