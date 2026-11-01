// frontend/src/api/dashboardApi.js
import { apiClient } from './client';

export const dashboardApi = {
    getDashboardDataCustom: async (queryParams = '') => {
        return await apiClient.get(`/dashboard${queryParams}`);
    },
    getDashboardData: async (queryParams = '') => {
        return await apiClient.get(`/dashboard${queryParams}`);
    }
};