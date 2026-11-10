import { newId } from '../lib/id.js';
import {
  createInvoiceRecord,
  getNextCorrelativo,
  updateInvoiceStatus,
  findInvoiceById,
  findInvoiceByPaymentId,
  listInvoicesByUser,
} from '../db/invoices.js';
import { buildUblPayload, sendInvoice, getPdf } from '../lib/apisperu.js';

/**
 * Emite un comprobante electrónico para un pago exitoso (Boleta o Factura)
 * Garantiza total desacoplamiento: si falla APIsPERU o SUNAT, se guarda PENDIENTE sin lanzar error.
 */
export const issueInvoiceForPayment = async ({ paymentRecord, plan, user, billingDetails }) => {
  // Verificar si ya existe un comprobante para este pago
  const existing = await findInvoiceByPaymentId(paymentRecord.id);
  if (existing) {
    return existing;
  }

  const isFactura = billingDetails?.tipo_doc === '01';
  const tipoDoc = isFactura ? '01' : '03';
  const serie = isFactura ? 'F001' : 'B001';

  // Configurar datos del cliente según comprobante
  let clientTipoDoc = '1';
  let clientNumDoc = user.dni || '00000000';
  let clientRznSocial = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'CLIENTE GYMSTARK';
  let clientAddress = '';

  if (isFactura) {
    clientTipoDoc = '6';
    clientNumDoc = billingDetails?.num_doc || billingDetails?.ruc || '';
    clientRznSocial = billingDetails?.rzn_social || billingDetails?.razon_social || clientRznSocial;
    clientAddress = billingDetails?.address || billingDetails?.direccion || '';
  } else if (billingDetails?.num_doc) {
    clientNumDoc = billingDetails.num_doc;
    if (billingDetails.rzn_social) {
      clientRznSocial = billingDetails.rzn_social;
    }
    clientAddress = billingDetails.address || '';
  }

  const correlativo = await getNextCorrelativo(serie);
  const amount = Number(paymentRecord.amount);

  const ublPayload = buildUblPayload({
    tipoDoc,
    serie,
    correlativo,
    client: {
      tipoDoc: clientTipoDoc,
      numDoc: clientNumDoc,
      rznSocial: clientRznSocial,
      address: clientAddress,
    },
    plan,
    amount,
  });

  const invoiceId = newId('INV');

  // Guardar inicialmente como PENDIENTE
  let invoice = await createInvoiceRecord({
    id: invoiceId,
    paymentId: paymentRecord.id,
    userId: user.id,
    tipoDoc,
    serie,
    correlativo,
    fechaEmision: new Date(),
    clientTipoDoc,
    clientNumDoc,
    clientRznSocial,
    clientAddress,
    mtoOperGravadas: ublPayload.mtoOperGravadas,
    mtoIgv: ublPayload.mtoIGV,
    totalVenta: ublPayload.mtoImpVenta,
    status: 'PENDIENTE',
    ublPayload,
  });

  // Intentar envío a SUNAT vía APIsPERU de forma desacoplada
  try {
    const result = await sendInvoice(ublPayload);
    if (result.success) {
      invoice = await updateInvoiceStatus({
        id: invoiceId,
        status: 'EMITIDO',
        sunatResponse: result.sunatResponse,
      });
    }
  } catch (err) {
    console.error('Error al enviar comprobante a APIsPERU/SUNAT (quedará PENDIENTE):', err.message);
    // El comprobante queda PENDIENTE en BD para reintento posterior
  }

  return invoice;
};

export const invoicesService = {
  issueInvoiceForPayment,
  getInvoiceById: findInvoiceById,
  getInvoiceByPaymentId: findInvoiceByPaymentId,
  getInvoicesByUser: listInvoicesByUser,
  getInvoicePdfStream: async (invoice) => {
    return getPdf(invoice.ubl_payload);
  },
};
