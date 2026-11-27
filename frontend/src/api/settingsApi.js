import { apiClient } from './client';

export const settingsApi = {
  getSettings: () => apiClient.get('/settings'),
  completeOnboarding: (payload) => apiClient.post('/settings/onboarding', payload),
  updateSettings: (payload) => apiClient.put('/settings', payload),
};
