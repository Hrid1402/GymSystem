import { z } from 'zod';

export const createMembershipSchema = z.object({
  plan_id: z.string().min(1),
  user_id: z.string().min(1).optional(), // staff only: which client to enroll
});

export const listMembershipsQuerySchema = z.object({
  user_id: z.string().min(1).optional(),
});