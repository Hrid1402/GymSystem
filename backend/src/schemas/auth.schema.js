import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del correo es inválido'),
  password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del correo es inválido (ejemplo: usuario@correo.com)'),
  password: z.string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  first_name: z.string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  last_name: z.string({ required_error: 'El apellido es obligatorio' })
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(100, 'El apellido no puede exceder 100 caracteres'),
  dni: z.string({ required_error: 'El DNI es obligatorio' })
    .trim()
    .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos'),
  phone: z.string()
    .trim()
    .regex(/^9\d{8}$/, 'El número celular debe tener 9 dígitos y empezar con 9')
    .optional(),
  date_of_birth: z.string()
    .date('La fecha de nacimiento debe tener el formato AAAA-MM-DD')
    .optional(),
});