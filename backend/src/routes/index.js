import { Router } from 'express';
import express from 'express';
import { notFound, errorHandler } from '../middleware/errors.middleware.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import plansRoutes from './plans.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.use(express.json());
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/plans', plansRoutes);
router.use('/users', usersRoutes);

router.use(notFound);
router.use(errorHandler);

export default router;