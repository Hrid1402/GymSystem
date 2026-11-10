import express, { Router } from 'express';
import { errorHandler, notFound } from '../middleware/errors.middleware.js';
import accessRoutes from './access.routes.js';
import authRoutes from './auth.routes.js';
import dashboardRouter from './dashboard.routes.js';
import healthRoutes from './health.routes.js';
import invoicesRoutes from './invoices.routes.js';
import membershipsRoutes from './memberships.routes.js';
import paymentsRoutes from './payments.routes.js';
import plansRoutes from './plans.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.use(express.json());
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/plans', plansRoutes);
router.use('/users', usersRoutes);
router.use('/memberships', membershipsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/access', accessRoutes);
router.use('/dashboard', dashboardRouter);

router.use(notFound);
router.use(errorHandler);

export default router;
