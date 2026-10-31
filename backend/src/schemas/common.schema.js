import { z } from 'zod';

/**
 * Checks if a date string (YYYY-MM-DD) corresponds to a person who is at least 18 years old.
 * Uses explicit calendar parts to prevent timezone shifts (e.g. UTC vs local time).
 */
export const isAdult = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const birthDate = new Date(year, month, day);
  // Verify valid calendar day (e.g., handles leap years, rejects Feb 30)
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month ||
    birthDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }

  return age >= 18;
};

export const nameSchema = (fieldName = 'El nombre') =>
  z.string({ required_error: `${fieldName} es obligatorio` })
    .trim()
    .min(1, `${fieldName} es obligatorio`)
    .max(100, `${fieldName} no puede exceder 100 caracteres`)
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, `${fieldName} solo puede contener letras y espacios`);

export const emailSchema = z.string({ required_error: 'El correo electrónico es obligatorio' })
  .trim()
  .toLowerCase()
  .email('El formato del correo es inválido (ejemplo: usuario@correo.com)');

export const passwordSchema = z.string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

export const dniSchema = z.string({ required_error: 'El DNI es obligatorio' })
  .trim()
  .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos')
  .refine((val) => val !== '00000000', { message: 'El número de DNI no es válido' });

export const phoneSchema = z.string()
  .trim()
  .regex(/^9\d{8}$/, 'El número celular debe tener 9 dígitos y empezar con 9');

export const dateOfBirthSchema = z.string({ required_error: 'La fecha de nacimiento es obligatoria' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de nacimiento debe tener el formato AAAA-MM-DD')
  .refine((val) => {
    const parts = val.split('-');
    const year = parseInt(parts[0], 10);
    return year >= 1900 && year <= new Date().getFullYear();
  }, { message: 'Ingrese una fecha de nacimiento válida' })
  .refine(isAdult, { message: 'El usuario debe ser mayor de edad (al menos 18 años)' });
