import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  dniSchema,
  phoneSchema,
  dateOfBirthSchema,
} from './common.schema.js';

export const loginSchema = z.object({
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del correo es inválido'),
  password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema('El nombre'),
  last_name: nameSchema('El apellido'),
  dni: dniSchema,
  phone: phoneSchema.optional(),
  date_of_birth: dateOfBirthSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});
