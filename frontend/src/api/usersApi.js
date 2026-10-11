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
  }
};
