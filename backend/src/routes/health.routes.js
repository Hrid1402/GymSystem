import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: API Health Check
 *     description: Returns the status of the Node.js server, memory usage, and database connection.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is online and database is connected.
 *       503:
 *         description: API is degraded (server is up, but database disconnected).
 */
router.get('/', checkHealth);

export default router;