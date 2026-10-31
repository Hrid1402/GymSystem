import { apiClient } from './client';

export const accessApi = {
  getMyQr: () => apiClient.get('/access/my-qr'),

  validateAccess: ({ qrToken, dni }) =>
    apiClient.post('/access/validate', { qrToken, dni }),

  getMyHistory: ({ page = 1, limit = 20 } = {}) =>
    apiClient.get(`/access/my-history?page=${page}&limit=${limit}`),

  getTodayStats: () => apiClient.get('/access/today-stats'),
};
