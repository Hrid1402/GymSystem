
import test from 'node:test';
import assert from 'node:assert/strict';

import { config } from 'dotenv';

config({ quiet: true });

const LOGIN_URL = 'http://localhost:3000/api/auth/login';

async function login(email, password) {
  return fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

test('Rechaza un correo con formato invalido', async () => {
  const response = await login('correo-invalido', 'Password123!');

  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.error, 'Validation failed');
});

test('Rechaza una contrasena vacia', async () => {
  const response = await login('cliente@example.com', '');

  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.error, 'Validation failed');
});

test('Rechaza credenciales incorrectas', async () => {
  const response = await login(
    'noexiste@example.com',
    'Password123!'
  );

  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.error, 'Invalid email or password');
});


test('Permite iniciar sesion con credenciales validas', {
  skip: !process.env.TEST_LOGIN_EMAIL ||
        !process.env.TEST_LOGIN_PASSWORD
        ? 'Credenciales de prueba no configuradas'
        : false,
}, async () => {
  const response = await login(
    process.env.TEST_LOGIN_EMAIL,
    process.env.TEST_LOGIN_PASSWORD
  );

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.ok(body.access_token);
  assert.ok(body.refresh_token);
  assert.ok(body.user);

  assert.equal(
    body.user.email,
    process.env.TEST_LOGIN_EMAIL
  );

  assert.equal(body.user.role, 'CLIENT');
  assert.equal(body.user.is_active, true);
});
