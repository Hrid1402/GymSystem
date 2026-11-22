import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const SALAS_PERMITIDAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5'];

const baseClassObject = z.object({
  nombre_clase: z
    .string({ required_error: 'El nombre de la clase es obligatorio' })
    .trim()
    .min(2, 'El nombre de la clase debe tener al menos 2 caracteres')
    .max(80, 'El nombre de la clase no puede superar los 80 caracteres'),
  descripcion: z.string().trim().max(300).optional().nullable(),
  entrenador_id: z
    .string({ required_error: 'El entrenador es obligatorio' })
    .trim()
    .min(1, 'El entrenador es obligatorio'),
  sala: z.enum(SALAS_PERMITIDAS, {
    errorMap: () => ({ message: 'La sala debe ser entre Sala 1 y Sala 5' }),
  }),
  fecha_clase: z
    .string({ required_error: 'La fecha de la clase es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de la clase es obligatoria (YYYY-MM-DD)'),
  hora_inicio: z
    .string({ required_error: 'La hora de inicio es obligatoria' })
    .regex(timeRegex, 'Hora de inicio inválida (HH:MM)'),
  hora_fin: z
    .string({ required_error: 'La hora de fin es obligatoria' })
    .regex(timeRegex, 'Hora de fin inválida (HH:MM)'),
  cupo_maximo: z.coerce
    .number()
    .int('El cupo máximo debe ser un número entero')
    .min(1, 'El cupo máximo debe ser al menos 1')
    .max(500, 'El cupo máximo no puede superar 500'),
});

export const createClassSchema = baseClassObject.refine(
  (data) => data.hora_inicio < data.hora_fin,
  {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['hora_fin'],
  }
);

export const updateClassSchema = baseClassObject
  .extend({
    estado: z.enum(['programada', 'en_curso', 'completada', 'cancelada']).optional(),
  })
  .refine((data) => data.hora_inicio < data.hora_fin, {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['hora_fin'],
  });