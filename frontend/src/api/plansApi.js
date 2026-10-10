import { apiClient } from './client';

export const plansApi = {
  getPlans: async () => {
    return await apiClient.get('/plans');
  },

  getAllPlansAdmin: async () => {
    return await apiClient.get('/plans/all');
  },

  getPlanById: async (id) => {
    return await apiClient.get(`/plans/${id}`);
  },

  createPlan: async (planData) => {
    return await apiClient.post('/plans', planData);
  },

  updatePlan: async (id, planData) => {
    return await apiClient.patch(`/plans/${id}`, planData);
  },

  deletePlan: async (id) => {
    return await apiClient.delete(`/plans/${id}`);
  },
};
