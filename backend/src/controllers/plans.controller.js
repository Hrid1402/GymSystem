import { listPlans, findPlanById, insertPlan, updatePlan, deletePlan } from '../db/plans.js';
import { newId } from '../lib/id.js';



export const getAllPlans = async (req, res) => {
  const plans = await listPlans({ onlyActive: true});
  res.json({ plans });
};

export const getAllPlansAdmin = async (req, res) => {
  const plans = await listPlans({ onlyActive: false });
  res.json({ plans });
}

export const getPlanById = async (req, res) => {
  const plan = await findPlanById(req.params.id);

  // Inactive plans don't exist as far as non-managers are concerned
  if (!plan || (!plan.is_active && !isManager(req))) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  res.json({ plan });
};

export const create = async (req, res) => {
  try {
    const plan = await insertPlan({ id: newId('PLN'), ...req.body });
    res.status(201).json({ plan });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A plan with that name already exists' });
    }
    throw err;
  }
};

export const update = async (req, res) => {
  try {
    const plan = await updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ plan });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A plan with that name already exists' });
    }
    throw err;
  }
};

export const remove = async (req, res) => {
  try {
    const deleted = await deletePlan(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Plan not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This plan has memberships and cannot be deleted. Deactivate it instead.',
      });
    }
    throw err;
  }
};