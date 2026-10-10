import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidAuthSession } from '../src/lib/authSession.js';

const validData = {
  user: { id: 'user-123' },
  session: {
    access_token: 'access-test',
    refresh_token: 'refresh-test',
  },
};

test('Acepta una sesion completa', () => {
  assert.equal(hasValidAuthSession(validData), true);
});

test('Rechaza una sesion inexistente', () => {
  assert.equal(hasValidAuthSession(null), false);
});

test('Rechaza una respuesta sin usuario', () => {
  assert.equal(
    hasValidAuthSession({ session: validData.session }),
    false
  );
});

test('Rechaza una sesion sin access token', () => {
  assert.equal(
    hasValidAuthSession({
      user: validData.user,
      session: { refresh_token: 'refresh-test' },
    }),
    false
  );
});

test('Rechaza una sesion sin refresh token', () => {
  assert.equal(
    hasValidAuthSession({
      user: validData.user,
      session: { access_token: 'access-test' },
    }),
    false
  );
});
