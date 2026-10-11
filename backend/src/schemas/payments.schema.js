import { z } from 'zod';

export const createPreferenceSchema = z.object({
  plan_id: z.string({
    required_error: 'El ID del plan es obligatorio',
  }).min(1, 'El ID del plan no puede estar vacío'),
});
