import { z } from 'zod';
import {
  dateOfBirthSchema,
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
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
  tipo_documento: z.enum(['dni', 'carnet_extranjeria', 'pasaporte'], {
    errorMap: () => ({ message: 'Tipo de documento inválido' }),
  }),
  numero_documento: z.string({ required_error: 'El número de documento es obligatorio' })
    .trim()
    .min(6, 'El número de documento debe tener al menos 6 caracteres')
    .max(12, 'El número de documento no puede superar los 12 caracteres'),
  phone: phoneSchema.optional(),
  date_of_birth: dateOfBirthSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});