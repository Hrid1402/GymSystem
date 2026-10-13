import { z } from 'zod';

const planFields = z.object({
  name: z.string({ required_error: 'El nombre del plan es obligatorio' })
    .trim()
    .min(1, 'El nombre del plan es obligatorio')
    .max(255, 'El nombre no puede exceder 255 caracteres'),
  description: z.string()
    .trim()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .nullable()
    .optional(),
  price: z.number({ required_error: 'El precio es obligatorio', invalid_type_error: 'El precio debe ser un número' })
    .min(5, 'El precio mínimo del plan es S/ 5.00')
    .max(99999999, 'El precio excede el límite permitido'),
  duration_days: z.number({ required_error: 'La duración en días es obligatoria', invalid_type_error: 'La duración debe ser un número entero' })
    .int('La duración en días debe ser un número entero')
    .positive('La duración debe ser mayor a 0 días')
    .max(3650, 'La duración no puede exceder 3650 días'),
  is_active: z.boolean({ invalid_type_error: 'El estado debe ser verdadero o falso' }).optional(),
});

export const createPlanSchema = planFields;

export const updatePlanSchema = planFields.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Se debe proporcionar al menos un campo para actualizar',
});