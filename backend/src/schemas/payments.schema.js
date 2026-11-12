import { z } from 'zod';

export const createOrderSchema = z.object({
  plan_id: z.string({
    required_error: 'El ID del plan es obligatorio',
  }).min(1, 'El ID del plan no puede estar vacío'),
});

export const processChargeSchema = z.object({
  plan_id: z.string({
    required_error: 'El ID del plan es obligatorio',
  }).min(1, 'El ID del plan no puede estar vacío'),
  token_id: z.string({
    required_error: 'El token de tarjeta es obligatorio',
  }).min(1, 'El token de tarjeta no puede estar vacío'),
  order_id: z.string().optional(),
  billing_details: z.object({
    tipo_doc: z.enum(['01', '03']).optional(),
    num_doc: z.string().optional(),
    rzn_social: z.string().optional(),
    razon_social: z.string().optional(),
    ruc: z.string().optional(),
    address: z.string().optional(),
    direccion: z.string().optional(),
  }).optional(),
});

// Alias para compatibilidad con código existente
export const createPreferenceSchema = createOrderSchema;
