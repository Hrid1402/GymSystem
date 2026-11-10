import { z } from 'zod';

export const validateAccessSchema = z
  .object({
    qrToken: z.string().min(1, 'El código QR no puede estar vacío').optional(),
    tipo_documento: z.enum(['dni', 'carnet_extranjeria', 'pasaporte'], {
      errorMap: () => ({ message: 'Tipo de documento inválido' })
    }).optional(),
    numero_documento: z.string().min(1, 'El número de documento no puede estar vacío').optional(),
    faceEmbedding: z.array(z.number()).optional(),
  })
  .refine((data) => Boolean(data.qrToken || (data.tipo_documento && data.numero_documento) || data.faceEmbedding), {
    message: 'Debe ingresar un código QR, un documento de identidad válido o usar reconocimiento facial',
    path: ['numero_documento'],
  });

export const accessHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});