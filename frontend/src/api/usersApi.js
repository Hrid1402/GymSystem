import { apiClient } from './client';

/**
 * Users API Service
 */
export const usersApi = {
  /**
   * Get list of registered users
   */
  getUsers: async () => {
    return await apiClient.get('/users');
  },

  /**
   * Create a new user with specified role
   * @param {Object} userData - { first_name, last_name, dni, email, password, role, phone }
   */
  createUser: async (userData) => {
    return await apiClient.post('/users', userData);
  },
};
