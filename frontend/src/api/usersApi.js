import { apiClient } from './client';


export const usersApi = {
  getUsers: async () => {
    return await apiClient.get('/users');
  },


  createUser: async (userData) => {
    return await apiClient.post('/users', userData);
  },


  // búsqueda para acceso manual de clientes por parte de recepcionistas
  search: async (query) => {
    return await apiClient.get(`/users/search?q=${query}`);
  },


  // consulta resumida para entrenadores vía QR (nombre, documento y membresía)
  getClientTrainerSummary: async (clientId) => {
    return await apiClient.get(`/users/${encodeURIComponent(clientId)}/trainer-lookup`);
  },

  // consulta resumida para entrenadores por número de documento
  getClientTrainerSummaryByDocument: async ({ numero_documento, tipo_documento }) => {
    const params = new URLSearchParams({ numero_documento: String(numero_documento).trim() });
    if (tipo_documento) {
      params.set('tipo_documento', tipo_documento);
    }
    return await apiClient.get(`/users/trainer-lookup/by-document?${params.toString()}`);
  },

  updateUser: async (id, data) => {
    return await apiClient.patch(`/users/${id}`, data);
  },


  changeEmail: async (id, { email, current_password }) => {
    return await apiClient.patch(`/users/${id}/email`, { email, current_password });
  },


  changePassword: async (id, { new_password, current_password }) => {
    return await apiClient.patch(`/users/${id}/password`, { new_password, current_password });
  },
};