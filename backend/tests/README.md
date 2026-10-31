# Pruebas Automatizadas (Backend)

Suite de pruebas end-to-end e integración para la API de **GymSystem**, implementada con **Vitest** y **Supertest**.

## Tecnologías
- **Vitest**: Test runner moderno con soporte nativo de ES Modules (ESM).
- **Supertest**: Permite realizar peticiones HTTP directamente a la instancia de Express en memoria sin necesidad de levantar un servidor en un puerto de red.

---

## Cómo Ejecutar las Pruebas

Desde la carpeta `backend`:

```bash
# Ejecutar toda la suite de pruebas una sola vez
npm test

# Modo observador (re-ejecuta pruebas automáticamente al guardar cambios)
npm run test:watch

# Ejecutar un archivo de prueba específico
npx vitest run tests/auth.test.js
```

> **Nota:** Las pruebas requieren que la base de datos de desarrollo (Supabase Local con Docker o Cloud) esté accesible y con el esquema inicializado (`npm run db:init` y `npm run db:seed`).

---

## Cobertura de la Suite (71 Pruebas)

### 1. Autenticación (`tests/auth.test.js` & `tests/auth.session.test.js`)
- `POST /api/auth/register`:
  - Registro exitoso de clientes (201).
  - Rechazo por campos obligatorios faltantes (400 con lista de detalles).
  - Validación de formato de correo electrónico inválido (400).
  - Validación de contraseña mínima de 8 caracteres (400).
  - Validación de DNI de 8 dígitos numéricos (400).
  - Restricción de mayoría de edad (mínimo 18 años) (400).
  - Rechazo de correos duplicados (409).
  - Rechazo de DNIs duplicados (409).
- `POST /api/auth/login`:
  - Inicio de sesión con credenciales válidas (200, JWT access/refresh token, perfil y rol).
  - Rechazo sin correo o contraseña (400).
  - Rechazo con contraseña incorrecta (401).
  - Rechazo de usuarios no registrados (401).
- `GET /api/auth/me`:
  - Validación de sesión con Bearer Token (200).
  - Rechazo sin cabecera Authorization (401).
  - Rechazo con token malformado o falso (401).
- `POST /api/auth/forgot-password`:
  - Envío exitoso para correos con formato válido (200).
  - Rechazo de formato no válido (400).
- Validación de sesiones completas y seguras (`hasValidAuthSession`).

### 2. Planes (`tests/plans.test.js`)
- `GET /api/plans`: Acceso público, lista únicamente planes activos (200).
- `GET /api/plans/all`:
  - Rechazo sin autenticación (401).
  - Rechazo a usuarios CLIENT (403).
  - Acceso permitido al MANAGER para planes activos e inactivos (200).
- `POST /api/plans`:
  - Validación de roles (solo MANAGER) (401/403).
  - Validación de campos requeridos (400).
  - Validación de precio mínimo de S/ 5.00 (400).
  - Validación de duración mayor a 0 días (400).
  - Creación exitosa por el MANAGER (201).
  - Rechazo por nombre de plan duplicado (409).
- `GET /api/plans/:id`: Detalle de plan (200) y error para ID inexistente (404).
- `PATCH /api/plans/:id`: Actualización de nombre y precio (200), rechazo con cuerpo vacío (400).
- `DELETE /api/plans/:id`: Eliminación física por el MANAGER (200/204), 404 para ID inexistente.

### 3. Usuarios y Roles (`tests/users.test.js`)
- `GET /api/users`:
  - Protección de ruta (401 para no autenticados, 403 para CLIENT).
  - Acceso al MANAGER para listar usuarios paginados (200).
- `GET /api/users/:id`:
  - CLIENT puede consultar su propio perfil (200).
  - MANAGER puede consultar el perfil de cualquier usuario (200).
  - Retorno 404 para usuario no existente.
- `POST /api/users`:
  - Validación de permisos (403 para CLIENT).
  - Rechazo de roles no permitidos como SUPERADMIN (400).
  - MANAGER crea usuarios con rol RECEPTIONIST (201).
- `PATCH /api/users/:id`:
  - Rechazo con cuerpo vacío (400).
  - Actualización de nombre y celular por el MANAGER (200).
  - Retorno 404 para usuario no existente.

### 4. Membresías (`tests/memberships.test.js`)
- `GET /api/memberships/me`: Cliente consulta su historial (200).
- `GET /api/memberships`: Listado general para STAFF/MANAGER (403 para clientes, 200 para manager).
- `POST /api/memberships`:
  - Validación de plan_id faltante (400) o inexistente (404).
  - Inscripción directa de un cliente por parte del MANAGER (201).
  - Rechazo si el cliente ya tiene una membresía activa (409).
- `PATCH /api/memberships/:id/cancel`: Cancelación de membresía activa (200), 404 para ID inexistente.

### 5. Pagos Mercado Pago Checkout Pro (`tests/payments.test.js`)
- `POST /api/payments/create-preference`:
  - Exclusivo para clientes activos (403 para managers u otros roles).
  - Validación de plan_id faltante (400).
  - Error 404 si el plan no existe o no está activo.
- `GET /api/payments/me`: Historial de pagos del cliente autenticado (200).
- `GET /api/payments/:id`: Retorno 404 para pago no encontrado.

### 6. Salud del Sistema (`tests/health.test.js`)
- `GET /api/health`: Estado en línea, tiempo de actividad, memoria y conexión activa a PostgreSQL (200).
- Rutas no existentes: Respuesta 404 estructurada con mensaje en JSON.
