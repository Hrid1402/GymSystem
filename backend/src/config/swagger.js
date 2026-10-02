import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gym API',
      version: '1.0.0',
      description: 'API documentation for the GymSystem project',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'USR-q3F9xT2_kLmA' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            dni: { type: 'string' },
            phone: { type: 'string', nullable: true },
            date_of_birth: { type: 'string', format: 'date', nullable: true },
            role: { type: 'string', enum: ['CLIENT', 'RECEPTIONIST', 'MANAGER'] },
            is_active: { type: 'boolean' },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'The request body failed validation.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Validation failed' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string', example: 'dni' },
                        message: { type: 'string', example: 'DNI must be 8 digits' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './src/routes/*.js', './routes/**/*.js', './src/routes/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } }));
};