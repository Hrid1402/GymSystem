// Base HTTP Client for API calls

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Standard fetch helper with JSON parsing and error handling
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Error HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
}

export const apiClient = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
