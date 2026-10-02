import { z } from 'zod';

const email = z.string().email();
const firstName = z.string().trim().min(1).max(100);
const lastName = z.string().trim().min(1).max(100);
const dni = z.string().regex(/^\d{8}$/, 'DNI must be 8 digits');
const phone = z.string().regex(/^9\d{8}$/, 'Phone must be 9 digits starting with 9');
const dateOfBirth = z.string().date(); // 'YYYY-MM-DD'
const role = z.enum(['CLIENT', 'RECEPTIONIST', 'MANAGER']);
const password = z.string().min(8);

export const createUserSchema = z.object({
  email,
  password: z.string().min(8),
  first_name: firstName,
  last_name: lastName,
  dni,
  phone: phone.optional(),
  date_of_birth: dateOfBirth.optional(),
  role: role.optional(), // only a manager may send something other than CLIENT
});

export const updateUserSchema = z
  .object({
    first_name: firstName,
    last_name: lastName,
    dni,
    phone: phone.nullable(),
    date_of_birth: dateOfBirth.nullable(),
    role,
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const changeEmailSchema = z.object({
  email,
  current_password: z.string().min(1).optional(), // required in the controller when changing your own
});

export const changePasswordSchema = z.object({
  new_password: password,
  current_password: z.string().min(1).optional(), // required in the controller when changing your own
});