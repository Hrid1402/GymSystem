import { apiClient } from './client';

export const usersApi = {
  getUsers: async () => {
    return await apiClient.get('/users');
  },

  createUser: async (userData) => {
    return await apiClient.post('/users', userData);
  },
};
