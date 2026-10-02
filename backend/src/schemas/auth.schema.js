import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  dni: z.string().regex(/^\d{8}$/, 'DNI must be 8 digits'),
  phone: z.string().regex(/^9\d{8}$/, 'Phone must be 9 digits starting with 9').optional(),
  date_of_birth: z.string().date().optional(), // 'YYYY-MM-DD'
});