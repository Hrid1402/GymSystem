import { apiClient } from './client';

/**
 * Authentication API Service
 */
export const authApi = {
  /**
   * Register a new account
   * @param {Object} userData - { first_name, last_name, dni, email, password, phone }
   */
  register: async (userData) => {
    return await apiClient.post('/auth/register', userData);
  },
};
