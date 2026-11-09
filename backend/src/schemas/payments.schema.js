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
});

// Alias para compatibilidad con código existente
export const createPreferenceSchema = createOrderSchema;
