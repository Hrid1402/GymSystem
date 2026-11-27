import { z } from 'zod';
import {
  findClassesViolatingSettings,
  getGymSettings,
  upsertGymSettings,
} from '../db/settings.js';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:MM)');

const baseSettingsSchema = z
  .object({
    maxCapacity: z.coerce.number().int().min(1, 'El aforo máximo debe ser al menos 1').max(5000),
    totalRooms: z.coerce.number().int().min(1, 'Debe haber al menos 1 sala').max(50),
    openingTime: timeSchema,
    closingTime: timeSchema,
  })
  .refine((data) => data.closingTime > data.openingTime, {
    message: 'La hora de cierre debe ser posterior a la hora de apertura',
    path: ['closingTime'],
  });

const onboardingSchema = baseSettingsSchema.safeExtend
  ? z
      .object({
        acceptTerms: z.literal(true, {
          errorMap: () => ({ message: 'Debes aceptar los términos y condiciones para continuar' }),
        }),
        maxCapacity: z.coerce.number().int().min(1, 'El aforo máximo debe ser al menos 1').max(5000),
        totalRooms: z.coerce.number().int().min(1, 'Debe haber al menos 1 sala').max(50),
        openingTime: timeSchema,
        closingTime: timeSchema,
      })
      .refine((data) => data.closingTime > data.openingTime, {
        message: 'La hora de cierre debe ser posterior a la hora de apertura',
        path: ['closingTime'],
      })
  : z
      .object({
        acceptTerms: z.literal(true, {
          errorMap: () => ({ message: 'Debes aceptar los términos y condiciones para continuar' }),
        }),
        maxCapacity: z.coerce.number().int().min(1, 'El aforo máximo debe ser al menos 1').max(5000),
        totalRooms: z.coerce.number().int().min(1, 'Debe haber al menos 1 sala').max(50),
        openingTime: timeSchema,
        closingTime: timeSchema,
      })
      .refine((data) => data.closingTime > data.openingTime, {
        message: 'La hora de cierre debe ser posterior a la hora de apertura',
        path: ['closingTime'],
      });

export const fetchSettings = async (req, res) => {
  const settings = await getGymSettings();
  return res.json({ settings });
};

export const completeOnboarding = async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }

  const current = await getGymSettings();
  if (current.isConfigured) {
    return res.status(409).json({
      error: 'La configuración inicial del gimnasio ya fue completada',
      settings: current,
    });
  }

  const conflicts = await findClassesViolatingSettings(parsed.data);
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `Hay ${conflicts.length} clase(s) activa(s) fuera de esas salas u horario (${conflicts[0].nombre_clase} en ${conflicts[0].sala}). Ajusta las clases o amplía el rango.`,
    });
  }

  const settings = await upsertGymSettings({
    ...parsed.data,
    isConfigured: true,
    acceptTerms: true,
    configuredBy: req.user?.id || null,
  });

  return res.status(200).json({ settings });
};

export const saveSettings = async (req, res) => {
  const parsed = baseSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }

  const conflicts = await findClassesViolatingSettings(parsed.data);
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `No se puede guardar porque hay ${conflicts.length} clase(s) activa(s) fuera del rango (${conflicts[0].nombre_clase} en ${conflicts[0].sala}, ${String(conflicts[0].hora_inicio).slice(0, 5)}-${String(conflicts[0].hora_fin).slice(0, 5)}). Edita o pausa esas clases primero.`,
    });
  }

  const current = await getGymSettings();
  const settings = await upsertGymSettings({
    ...parsed.data,
    isConfigured: current.isConfigured,
    acceptTerms: false,
    configuredBy: current.configuredBy || req.user?.id || null,
  });

  return res.status(200).json({ settings });
};
