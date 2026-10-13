import { z } from 'zod';

const email = z.string({ required_error: 'El correo electrónico es obligatorio' })
  .trim()
  .toLowerCase()
  .email('El formato del correo es inválido (ejemplo: usuario@correo.com)');
const firstName = z.string({ required_error: 'El nombre es obligatorio' })
  .trim()
  .min(1, 'El nombre es obligatorio')
  .max(100, 'El nombre no puede exceder 100 caracteres');
const lastName = z.string({ required_error: 'El apellido es obligatorio' })
  .trim()
  .min(1, 'El apellido es obligatorio')
  .max(100, 'El apellido no puede exceder 100 caracteres');
const dni = z.string({ required_error: 'El DNI es obligatorio' })
  .trim()
  .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos');
const phone = z.string()
  .trim()
  .regex(/^9\d{8}$/, 'El número celular debe tener 9 dígitos y empezar con 9');
const dateOfBirth = z.string().date('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
const role = z.enum(['CLIENT', 'RECEPTIONIST', 'MANAGER'], {
  message: 'El rol debe ser CLIENT, RECEPTIONIST o MANAGER',
});
const password = z.string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

export const createUserSchema = z.object({
  email,
  password,
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
    is_active: z.boolean({ invalid_type_error: 'El estado debe ser verdadero o falso' }),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se debe proporcionar al menos un campo para actualizar',
  });

export const changeEmailSchema = z.object({
  email,
  current_password: z.string().min(1, 'La contraseña actual es obligatoria').optional(),
});

export const changePasswordSchema = z.object({
  new_password: password,
  current_password: z.string().min(1, 'La contraseña actual es obligatoria').optional(),
});