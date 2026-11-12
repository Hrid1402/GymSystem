import { apiClient } from './client';

export const invoicesApi = {
  // Obtener historial de comprobantes del cliente
  getMyInvoices: () => apiClient.get('/invoices/my'),

  // Descarga del PDF oficial on-the-fly
  downloadPdf: (invoiceId, filename) =>
    apiClient.downloadBlob(`/invoices/${invoiceId}/pdf`, filename),
};
