import { randomBytes } from 'node:crypto';

export const newId = (prefix) => `${prefix}-${randomBytes(9).toString('base64url')}`;