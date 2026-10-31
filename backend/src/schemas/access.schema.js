import { z } from 'zod';
import { dniSchema } from './common.schema.js';

export const validateAccessSchema = z
  .object({
    qrToken: z.string().min(1, 'El código QR no puede estar vacío').optional(),
    dni: dniSchema.optional(),
  })
  .refine((data) => Boolean(data.qrToken || data.dni), {
    message: 'Debe ingresar un código QR (qrToken) o un DNI (dni)',
    path: ['qrToken'],
  });

export const accessHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
