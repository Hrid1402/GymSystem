import { apiClient } from './client';

export const authApi = {
  login: async (credentials) => {
    return await apiClient.post('/auth/login', credentials);
  },

  register: async (userData) => {
    return await apiClient.post('/auth/register', userData);
  },

  getMe: async () => {
    return await apiClient.get('/auth/me');
  },

  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token, password) => {
    return await apiClient.post(
      '/auth/reset-password',
      { password },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
};
