# GymSystem (GymStark)

Plataforma de gestión de gimnasios (membresías, pagos en línea con Mercado Pago, control de asistencia y roles).

## Tech Stack
- **Backend:** Node.js, Express, Supabase (PostgreSQL & Auth), Mercado Pago SDK v3, Zod, Swagger/OpenAPI.
- **Frontend:** React, Vite, React Router, TailwindCSS, Sonner.
- **Testing:** Vitest, Supertest (71 pruebas E2E e integración).

---

## Requisitos Previos
- **Node.js** (v20+) y `npm`
- **Docker Desktop** (requerido solo para ejecutar Supabase en local; no es necesario si usas Supabase Cloud)

---

## Instalación y Configuración

### 1. Instalar dependencias
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Base de datos y Auth (Supabase)

- **Local (con Docker Desktop en ejecución):**
  ```bash
  cd backend
  npm run supabase:start
  ```
  Puertos locales por defecto:
  - PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  - Auth / API: `http://127.0.0.1:54321`
  - Studio UI: `http://127.0.0.1:54323`

- **Cloud:** Configura las credenciales de tu proyecto en `.env` (no requiere Docker).

### 3. Variables de entorno

- **Backend:** Copiar `backend/.example.env` a `backend/.env` y verificar credenciales.
  ```bash
  cp backend/.example.env backend/.env
  ```
- **Frontend:** Copiar `frontend/.env.example` a `frontend/.env`.
  ```bash
  cp frontend/.env.example frontend/.env
  ```

### 4. Esquema de base de datos y Seed
Desde `backend`:
```bash
npm run db:init  # Crea tablas, índices y claves foráneas
npm run db:seed  # Crea o sincroniza la cuenta inicial del Gerente
```

### 5. Iniciar servidores de desarrollo

- **Backend:**
  ```bash
  cd backend && npm run dev
  ```
  - API: `http://localhost:3000/api`
  - Swagger UI: `http://localhost:3000/api-docs`
  - Health check: `http://localhost:3000/api/health`

- **Frontend:**
  ```bash
  cd frontend && npm run dev
  ```
  - App: `http://localhost:5173`

---

## Pruebas Automatizadas

```bash
cd backend
npm test           # Ejecuta toda la suite (71 tests)
npm run test:watch # Modo observador
```

---

## Comandos Útiles (Backend)

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia servidor Express con recarga en caliente |
| `npm test` | Ejecuta las pruebas automatizadas con Vitest |
| `npm run test:watch` | Ejecuta pruebas en modo observador |
| `npm run db:init` | Aplica el esquema a PostgreSQL |
| `npm run db:seed` | Siembra la cuenta inicial del Gerente |
| `npm run supabase:start` | Inicia contenedores locales de Supabase (Docker) |
| `npm run supabase:stop` | Detiene contenedores locales de Supabase |
| `npm run supabase:status` | Muestra estado, puertos y llaves de Supabase local |
