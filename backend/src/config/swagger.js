import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GymStark API',
      version: '1.0.0',
      description: 'Documentación oficial de la API REST del sistema de gestión GymStark. Incluye reglas de negocio, validaciones estrictas y control de acceso por roles.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de acceso JWT obtenido al iniciar sesión en /api/auth/login.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          description: 'Modelo de usuario del sistema (Clientes, Recepcionistas y Gerentes).',
          properties: {
            id: { type: 'string', example: 'USR-q3F9xT2_kLmA', description: 'Identificador único del usuario con prefijo USR.' },
            email: { type: 'string', format: 'email', example: 'cliente@ejemplo.com', description: 'Correo electrónico único en minúsculas.' },
            first_name: { type: 'string', example: 'Carlos', description: 'Nombres del usuario (solo letras y espacios, máx. 100 caracteres).' },
            last_name: { type: 'string', example: 'Mendoza', description: 'Apellidos del usuario (solo letras y espacios, máx. 100 caracteres).' },
            dni: { type: 'string', example: '72345678', description: 'DNI peruano único de exactamente 8 dígitos numéricos (no 00000000).' },
            phone: { type: 'string', nullable: true, example: '987654321', description: 'Número celular de 9 dígitos que inicia con 9.' },
            date_of_birth: { type: 'string', format: 'date', example: '1995-08-15', description: 'Fecha de nacimiento (AAAA-MM-DD). Obligatoria y debe certificar mayoría de edad (>= 18 años).' },
            role: { type: 'string', enum: ['CLIENT', 'RECEPTIONIST', 'MANAGER'], example: 'CLIENT', description: 'Rol asignado al usuario.' },
            is_active: { type: 'boolean', example: true, description: 'Indica si la cuenta está activa para operar en el sistema.' },
          },
        },
        Membership: {
          type: 'object',
          description: 'Membresía contratada por un cliente.',
          properties: {
            id: { type: 'string', example: 'MEM-q3F9xT2_kLmA', description: 'Identificador único de membresía con prefijo MEM.' },
            user_id: { type: 'string', example: 'USR-q3F9xT2_kLmA', description: 'ID del cliente titular.' },
            plan_id: { type: 'string', example: 'PLN-q3F9xT2_kLmA', description: 'ID del plan contratado.' },
            plan_name: { type: 'string', example: 'Plan Mensual Pro', description: 'Nombre descriptivo del plan.' },
            first_name: { type: 'string', example: 'Carlos', description: 'Nombres del cliente.' },
            last_name: { type: 'string', example: 'Mendoza', description: 'Apellidos del cliente.' },
            dni: { type: 'string', example: '72345678', description: 'DNI del cliente.' },
            start_date: { type: 'string', format: 'date', example: '2026-10-30', description: 'Fecha de inicio del periodo en zona horaria America/Lima.' },
            end_date: { type: 'string', format: 'date', example: '2026-11-28', description: 'Fecha de culminación del periodo en zona horaria America/Lima.' },
            status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'], example: 'ACTIVE', description: 'Estado actual de la membresía.' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Plan: {
          type: 'object',
          description: 'Plan de entrenamiento ofrecido por el gimnasio.',
          properties: {
            id: { type: 'string', example: 'PLN-q3F9xT2_kLmA', description: 'Identificador único del plan con prefijo PLN.' },
            name: { type: 'string', example: 'Plan Mensual Pro', description: 'Nombre del plan (1 a 255 caracteres).' },
            description: { type: 'string', example: 'Acceso total a sala de pesas, cardio y asesoría inicial.', description: 'Descripción obligatoria (1 a 1000 caracteres).' },
            price: { type: 'number', example: 89.9, description: 'Precio en Soles (PEN) con IGV incluido (mínimo S/ 5.00).' },
            duration_days: { type: 'integer', example: 30, description: 'Duración en días calendario (entero positivo, máx. 3650).' },
            is_active: { type: 'boolean', example: true, description: 'Indica si el plan está disponible para nuevas inscripciones.' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          description: 'Registro de transacción y orden de pago en Culqi Checkout v4 con facturación electrónica SUNAT.',
          properties: {
            id: { type: 'string', example: 'PAY-q3F9xT2_kLmA', description: 'Identificador del intento de pago con prefijo PAY.' },
            user_id: { type: 'string', example: 'USR-q3F9xT2_kLmA', description: 'ID del cliente.' },
            plan_id: { type: 'string', example: 'PLN-q3F9xT2_kLmA', description: 'ID del plan a adquirir.' },
            order_id: { type: 'string', example: 'ord_live_123456789', description: 'ID de orden en Culqi v4.' },
            culqi_charge_id: { type: 'string', nullable: true, example: 'chr_live_987654321', description: 'ID de cargo asignado por Culqi tras procesar el cobro.' },
            status: { type: 'string', example: 'approved', description: 'Estado del pago (pending, approved, rejected, cancelled).' },
            status_detail: { type: 'string', nullable: true, example: 'venta_exitosa', description: 'Detalle provisto por la pasarela Culqi.' },
            amount: { type: 'number', example: 90.0, description: 'Monto total en Soles (PEN).' },
            currency_id: { type: 'string', example: 'PEN' },
            payment_method_id: { type: 'string', nullable: true, example: 'tarjeta' },
            membership_id: { type: 'string', nullable: true, example: 'MEM-q3F9xT2_kLmA', description: 'ID de la membresía activada.' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Los datos enviados en la solicitud no cumplen con las validaciones requeridas.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'El DNI debe tener exactamente 8 dígitos numéricos' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string', example: 'dni' },
                        message: { type: 'string', example: 'El DNI debe tener exactamente 8 dígitos numéricos' },
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
  apis: ['./routes/*.js', './src/routes/*.js', './routes/**/*.js', './src/routes/**/*.js', './src/docs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } }));
};
