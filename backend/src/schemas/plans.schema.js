import { z } from 'zod';

const planFields = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().min(0).max(99999999),
  duration_days: z.number().int().positive().max(3650),
  is_active: z.boolean().optional(),
});

export const createPlanSchema = planFields;

export const updatePlanSchema = planFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });