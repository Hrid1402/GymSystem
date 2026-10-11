import { apiClient } from './client';

export const membershipsApi = {
  // Obtener las membresías del usuario autenticado actual (cliente)
  getMyMemberships: () => apiClient.get('/memberships/me'),

  // Obtener todas las membresías (para recepcionista o gerente).
  // Opcionalmente filtradas por query param user_id: /memberships?user_id=...
  getAllMemberships: (userId) => {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return apiClient.get(`/memberships${query}`);
  },

  // Inscribir a una membresía
  // - Cliente: { plan_id } (se inscribe a sí mismo)
  // - Staff (recepcionista / gerente): { plan_id, user_id }
  enroll: ({ plan_id, user_id }) => {
    const payload = { plan_id };
    if (user_id) payload.user_id = user_id;
    return apiClient.post('/memberships', payload);
  },

  // Cancelar membresía activa
  cancelMembership: (membershipId) => apiClient.patch(`/memberships/${membershipId}/cancel`),
};
