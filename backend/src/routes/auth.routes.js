import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { login, register, me } from '../controllers/auth.controller.js';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in
 *     description: Authenticates a user with email and password and returns a session token. Use the access_token as a Bearer token on protected endpoints.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ana@example.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 expires_at:
 *                   type: integer
 *                   description: Unix timestamp (seconds) when the access token expires.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid email or password.
 *       403:
 *         description: The account has no profile or has been deactivated.
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new client account
 *     description: Creates a new account. Self-registration always creates a user with the CLIENT role.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name, dni]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ana@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: mypassword123
 *               first_name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Ana
 *               last_name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Torres
 *               dni:
 *                 type: string
 *                 pattern: '^\d{8}$'
 *                 example: '12345678'
 *               phone:
 *                 type: string
 *                 pattern: '^9\d{8}$'
 *                 description: Optional. 9 digits starting with 9.
 *                 example: '987654321'
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 description: Optional. Format YYYY-MM-DD.
 *                 example: '1998-05-20'
 *     responses:
 *       201:
 *         description: Account created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: A user with that email or DNI already exists.
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current user
 *     description: Returns the profile of the user that owns the Bearer token.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing, invalid, or expired token.
 *       403:
 *         description: The account has no profile or has been deactivated.
 */
router.get('/me', requireAuth, me);

export default router;