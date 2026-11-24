import { apiClient } from './client';

export const paymentsApi = {
  // Crear orden Culqi v4 para un plan
  createOrder: ({ plan_id }) => apiClient.post('/payments/create-order', { plan_id }),

  // Procesar cobro con token generado por Culqi Checkout v4
  charge: ({ plan_id, token_id, order_id }) =>
    apiClient.post('/payments/charge', { plan_id, token_id, order_id }),

  // Registrar cobro presencial en efectivo en mostrador (recepcionista / gerente)
  cashCharge: ({ client_id, plan_id, billing_details }) =>
    apiClient.post('/payments/cash-charge', { client_id, plan_id, billing_details }),

  // Resumen del día de cobros en caja (efectivo vs online)
  getDailySummary: () => apiClient.get('/payments/daily-summary'),

  // Historial de pagos del cliente autenticado
  getMyPayments: () => apiClient.get('/payments/me'),

  // Listado general de pagos (recepcionista / gerente)
  getAllPayments: (params) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient.get(`/payments${query}`);
  },
};
