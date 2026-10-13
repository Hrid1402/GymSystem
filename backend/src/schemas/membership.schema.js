import { z } from 'zod';

export const createMembershipSchema = z.object({
  plan_id: z.string({ required_error: 'El ID del plan es obligatorio' })
    .min(1, 'El ID del plan es obligatorio'),
  user_id: z.string().min(1, 'El ID de usuario es obligatorio').optional(), // staff only: which client to enroll
});

export const listMembershipsQuerySchema = z.object({
  user_id: z.string().min(1, 'El ID de usuario es obligatorio').optional(),
});