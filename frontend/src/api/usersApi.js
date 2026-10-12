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
