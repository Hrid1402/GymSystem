import 'dotenv/config';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import { supabaseAdmin } from '../src/lib/supabaseClient.js';

let cachedManagerToken = null;

export const api = request(app);

export const getManagerAuth = async () => {
  if (cachedManagerToken) return cachedManagerToken;

  const res = await api
    .post('/api/auth/login')
    .send({
      email: process.env.INITIAL_MANAGER_EMAIL,
      password: process.env.INITIAL_MANAGER_PASSWORD,
    });

  if (res.status !== 200 || !res.body.access_token) {
    throw new Error(`Failed to log in as manager during test setup: ${res.status} ${JSON.stringify(res.body)}`);
  }

  cachedManagerToken = {
    token: res.body.access_token,
    user: res.body.user,
    headers: {
      Authorization: `Bearer ${res.body.access_token}`,
    },
  };

  return cachedManagerToken;
};

export const createTestClientUser = async (customEmail = null) => {
  const email = customEmail || `client_test_${Date.now()}_${Math.floor(Math.random() * 1000)}@gymtest.com`;
  const dni = String(Math.floor(10000000 + Math.random() * 90000000));
  const password = 'TestPassword123!';

  const regRes = await api
    .post('/api/auth/register')
    .send({
      email,
      password,
      first_name: 'Test',
      last_name: 'Client',
      dni,
      phone: '987654321',
      date_of_birth: '1998-04-12',
    });

  if (regRes.status !== 201) {
    throw new Error(`Failed to register test client: ${regRes.status} ${JSON.stringify(regRes.body)}`);
  }

  const loginRes = await api
    .post('/api/auth/login')
    .send({ email, password });

  return {
    email,
    password,
    dni,
    user: regRes.body.user,
    token: loginRes.body.access_token,
    headers: {
      Authorization: `Bearer ${loginRes.body.access_token}`,
    },
  };
};

export const deleteTestUser = async (supabaseUserId) => {
  if (!supabaseUserId) return;
  try {
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
  } catch {
    // Ignore cleanup errors
  }
};

export const closeDb = async () => {
  try {
    await pool.end();
  } catch {
    // Already closed or not connected
  }
};
