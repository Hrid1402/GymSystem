import { describe, it, expect } from 'vitest';
import { api } from './helpers.js';

describe('Health & Global Routes', () => {
  it('GET /api/health retorna 200 con estado del sistema y conexion a base de datos', async () => {
    const res = await api.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('online');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.memory_usage).toBeDefined();
    expect(typeof res.body.data.uptime).toBe('number');
  });

  it('Rutas no existentes retornan 404 estructurado', async () => {
    const res = await api.get('/api/ruta-que-no-existe-en-el-sistema');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).toMatch(/no encontrada/i);
  });
});
