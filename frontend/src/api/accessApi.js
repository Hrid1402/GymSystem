import { apiClient } from './client';

export const accessApi = {
  getMyQr: () => apiClient.get('/access/my-qr'),

  validateAccess: ({ qrToken, tipo_documento, numero_documento, faceEmbedding }) =>
    apiClient.post('/access/validate', { qrToken, tipo_documento, numero_documento, faceEmbedding }),

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