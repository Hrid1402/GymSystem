import { z } from 'zod';
import {
  deleteCatalogItem,
  findCatalogById,
  insertCatalogItem,
  listCatalog,
  updateCatalogItem,
} from '../db/classCatalog.js';
import { newId } from '../lib/id.js';

const createCatalogSchema = z.object({
  nombre: z.string({ required_error: 'El nombre de la disciplina es obligatorio' }).trim().min(2).max(100),
  categoria: z.enum(['basica', 'especializada'], {
    errorMap: () => ({ message: 'La categoría debe ser basica o especializada' }),
  }),
});

const updateCatalogSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    categoria: z.enum(['basica', 'especializada']).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se debe enviar al menos un campo para actualizar',
  });

export const getCatalog = async (req, res) => {
  const includeInactive = req.user?.role === 'MANAGER' && req.query?.all === 'true';
  const catalog = await listCatalog({ onlyActive: !includeInactive });
  return res.json({ catalog });
};

export const createCatalog = async (req, res) => {
  const parsed = createCatalogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }

  try {
    const item = await insertCatalogItem({
      id: newId('CAT'),
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria,
    });
    return res.status(201).json({ item });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una disciplina con ese nombre en el catálogo' });
    }
    throw err;
  }
};

export const updateCatalog = async (req, res) => {
  const parsed = updateCatalogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }

  try {
    const existing = await findCatalogById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Disciplina no encontrada' });
    }

    const item = await updateCatalogItem(req.params.id, parsed.data);
    return res.json({ item });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otra disciplina con ese nombre' });
    }
    throw err;
  }
};

export const removeCatalog = async (req, res) => {
  try {
    const deleted = await deleteCatalogItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Disciplina no encontrada' });
    }
    return res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar esta disciplina porque ya está asignada a horarios en el cronograma. Puedes desactivarla en su lugar.',
      });
    }
    throw err;
  }
};
