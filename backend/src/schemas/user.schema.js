import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  dniSchema,
  phoneSchema,
  dateOfBirthSchema,
} from './common.schema.js';

const role = z.enum(['CLIENT', 'RECEPTIONIST', 'MANAGER'], {
  message: 'El rol debe ser CLIENT, RECEPTIONIST o MANAGER',
});

const tipoDocumentoSchema = z.enum(['dni', 'carnet_extranjeria', 'pasaporte'], {
  errorMap: () => ({ message: 'Tipo de documento inválido' }),
});

const numeroDocumentoSchema = z
  .string({ required_error: 'El número de documento es obligatorio' })
  .trim()
  .min(6, 'El número de documento debe tener al menos 6 caracteres')
  .max(12, 'El número de documento no puede superar los 12 caracteres');

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: nameSchema('El nombre'),
  last_name: nameSchema('El apellido'),
  tipo_documento: tipoDocumentoSchema.default('dni'),
  numero_documento: numeroDocumentoSchema,
  phone: phoneSchema.optional(),
  date_of_birth: dateOfBirthSchema,
  role: role.optional(), // only a manager may send something other than CLIENT
});

export const updateUserSchema = z
  .object({
    first_name: nameSchema('El nombre'),
    last_name: nameSchema('El apellido'),
    tipo_documento: tipoDocumentoSchema,
    numero_documento: numeroDocumentoSchema,
    phone: phoneSchema.nullable(),
    date_of_birth: dateOfBirthSchema.nullable(),
    role,
    is_active: z.boolean({ invalid_type_error: 'El estado debe ser verdadero o falso' }),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se debe proporcionar al menos un campo para actualizar',
  });

export const changeEmailSchema = z.object({
  email: emailSchema,
  current_password: z.string().min(1, 'La contraseña actual es obligatoria').optional(),
});

export const changePasswordSchema = z.object({
  new_password: passwordSchema,
  current_password: z.string().min(1, 'La contraseña actual es obligatoria').optional(),
});
