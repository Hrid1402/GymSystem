import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const SALAS_PERMITIDAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5'];

const baseClassObject = z.object({
  catalog_id: z.string().trim().min(1).optional().nullable(),
  nombre_clase: z
    .string()
    .trim()
    .min(2, 'El nombre de la clase debe tener al menos 2 caracteres')
    .max(80, 'El nombre de la clase no puede superar los 80 caracteres')
    .optional(),
  categoria: z.enum(['basica', 'especializada']).optional(),
  descripcion: z.string().trim().max(300).optional().nullable(),
  entrenador_id: z
    .string({ required_error: 'El entrenador es obligatorio' })
    .trim()
    .min(1, 'El entrenador es obligatorio'),
  sala: z.enum(SALAS_PERMITIDAS, {
    errorMap: () => ({ message: 'La sala debe ser entre Sala 1 y Sala 5' }),
  }),
  dia_semana: z.coerce
    .number({ required_error: 'El día de la semana es obligatorio' })
    .int('El día de la semana debe ser un entero entre 0 (Domingo) y 6 (Sábado)')
    .min(0, 'El día de la semana debe estar entre 0 y 6')
    .max(6, 'El día de la semana debe estar entre 0 y 6'),
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

export const createClassSchema = baseClassObject
  .refine((data) => Boolean(data.catalog_id || data.nombre_clase), {
    message: 'Debes seleccionar una disciplina del catálogo o indicar el nombre de la clase',
    path: ['catalog_id'],
  })
  .refine((data) => data.hora_inicio < data.hora_fin, {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['hora_fin'],
  });

export const updateClassSchema = baseClassObject
  .extend({
    estado: z.enum(['activa', 'inactiva']).optional(),
  })
  .refine((data) => data.hora_inicio < data.hora_fin, {
    message: 'La hora de fin debe ser posterior a la hora de inicio',
    path: ['hora_fin'],
  });
