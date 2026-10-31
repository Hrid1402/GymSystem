import { describe, it, expect } from 'vitest';
import { hasValidAuthSession } from '../src/lib/authSession.js';

describe('Auth Session Helper', () => {
  const validData = {
    user: { id: 'user-123' },
    session: {
      access_token: 'access-test',
      refresh_token: 'refresh-test',
    },
  };

  it('Acepta una sesión completa y válida', () => {
    expect(hasValidAuthSession(validData)).toBe(true);
  });

  it('Rechaza una sesión nula o inexistente', () => {
    expect(hasValidAuthSession(null)).toBe(false);
    expect(hasValidAuthSession(undefined)).toBe(false);
  });

  it('Rechaza una respuesta sin usuario', () => {
    expect(hasValidAuthSession({ session: validData.session })).toBe(false);
  });

  it('Rechaza una sesión sin access token', () => {
    expect(
      hasValidAuthSession({
        user: validData.user,
        session: { refresh_token: 'refresh-test' },
      })
    ).toBe(false);
  });

  it('Rechaza una sesión sin refresh token', () => {
    expect(
      hasValidAuthSession({
        user: validData.user,
        session: { access_token: 'access-test' },
      })
    ).toBe(false);
  });
});
