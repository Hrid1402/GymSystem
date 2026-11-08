import { apiClient } from './client';

export const accessApi = {
  getMyQr: () => apiClient.get('/access/my-qr'),

  validateAccess: ({ qrToken, dni, faceEmbedding }) =>
    apiClient.post('/access/validate', { qrToken, dni, faceEmbedding }),

  identifyFace: (faceEmbedding) =>
    apiClient.post('/access/identify-face', { faceEmbedding }),

  confirmAttendance: (userId, membershipId) =>
    apiClient.post('/access/confirm-attendance', { userId, membershipId }),

  // Actualizado para apuntar a la ruta correcta bajo /users
  registerFace: (userId, embedding) =>
    apiClient.post('/users/register-face', { userId, embedding }),

  getMyHistory: ({ page = 1, limit = 20 } = {}) =>
    apiClient.get(`/access/my-history?page=${page}&limit=${limit}`),

  getTodayStats: () => apiClient.get('/access/today-stats'),
};