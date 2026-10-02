import { Router } from 'express';
import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.use(express.json());
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;