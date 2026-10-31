import { listPlans, findPlanById, insertPlan, updatePlan, deletePlan } from '../db/plans.js';
import { newId } from '../lib/id.js';

export const getAllPlans = async (req, res) => {
  const plans = await listPlans({ onlyActive: true });
  res.json({ plans });
};

export const getAllPlansAdmin = async (req, res) => {
  const plans = await listPlans({ onlyActive: false });
  res.json({ plans });
};

export const getPlanById = async (req, res) => {
  const plan = await findPlanById(req.params.id);

  // Inactive plans don't exist as far as non-managers are concerned
  if (!plan || (!plan.is_active && req.user?.role !== 'MANAGER')) {
    return res.status(404).json({ error: 'Plan no encontrado o no disponible' });
  }
  res.json({ plan });
};

export const create = async (req, res) => {
  try {
    const plan = await insertPlan({ id: newId('PLN'), ...req.body });
    res.status(201).json({ plan });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un plan registrado con ese nombre' });
    }
    throw err;
  }
};

export const update = async (req, res) => {
  try {
    const plan = await updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ plan });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un plan registrado con ese nombre' });
    }
    throw err;
  }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await deletePlan(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Plan no encontrado' });
    return res.status(204).send();
  } catch (err) {
    if (
      err.code === '23503' ||
      err.message?.toLowerCase().includes('foreign key') ||
      err.message?.toLowerCase().includes('violates foreign key')
    ) {
      return res.status(409).json({
        error: 'No se puede eliminar este plan porque cuenta con clientes o membresías asociadas. Te sugerimos desactivarlo en su lugar.',
      });
    }
    if (next) return next(err);
    throw err;
  }
};
