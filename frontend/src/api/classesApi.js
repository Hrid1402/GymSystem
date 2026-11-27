import { apiClient } from './client';

export const classesApi = {
  getClasses: async () => {
    return await apiClient.get('/classes');
  },

  createClass: async (classData) => {
    return await apiClient.post('/classes', classData);
  },

  updateClass: async (id, classData) => {
    const url = `/classes/${encodeURIComponent(id)}`;

    if (typeof apiClient.put === 'function') {
      return await apiClient.put(url, classData);
    }

    if (typeof apiClient.patch === 'function') {
      return await apiClient.patch(url, classData);
    }

    if (typeof apiClient.request === 'function') {
      return await apiClient.request(url, {
        method: 'PUT',
        body: JSON.stringify(classData),
      });
    }

    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(classData),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || 'No se pudo actualizar la clase.');
    }
    return data;
  },

  deleteClass: async (id) => {
    const url = `/classes/${encodeURIComponent(id)}`;

    if (typeof apiClient.delete === 'function') {
      return await apiClient.delete(url);
    }

    if (typeof apiClient.request === 'function') {
      return await apiClient.request(url, { method: 'DELETE' });
    }

    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const res = await fetch(`${baseUrl}${url}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || 'No se pudo eliminar la clase.');
    }
    return data;
  },

  enrollClass: async (id) => {
    return await apiClient.post(`/classes/${encodeURIComponent(id)}/enroll`, {});
  },

  unenrollClass: async (id) => {
    const url = `/classes/${encodeURIComponent(id)}/enroll`;
    if (typeof apiClient.delete === 'function') {
      return await apiClient.delete(url);
    }
    return await apiClient.request(url, { method: 'DELETE' });
  },

  getEnrollments: async (id) => {
    return await apiClient.get(`/classes/${encodeURIComponent(id)}/enrollments`);
  },

  getCatalog: async (includeAll = false) => {
    return await apiClient.get(`/classes/catalog${includeAll ? '?all=true' : ''}`);
  },

  createCatalogItem: async (data) => {
    return await apiClient.post('/classes/catalog', data);
  },

  updateCatalogItem: async (id, data) => {
    return await apiClient.patch(`/classes/catalog/${encodeURIComponent(id)}`, data);
  },

  deleteCatalogItem: async (id) => {
    return await apiClient.delete(`/classes/catalog/${encodeURIComponent(id)}`);
  },
};