# GymSystem (GymStark)

Plataforma integral de gestión de gimnasios: administración de clientes multi-documento (DNI, Carnet de Extranjería, Pasaporte), membresías, pagos en línea con **Culqi Checkout**, facturación electrónica **SUNAT (UBL 2.1 vía APIsPERU)**, control de acceso por **QR dinámico**, **acceso manual** y **reconocimiento facial**.

## Tech Stack
- **Backend:** Node.js (v20+), Express, Supabase (PostgreSQL & Auth), Culqi API v2, APIsPERU (SUNAT UBL 2.1), PDFKit, Zod, Swagger/OpenAPI.
- **Frontend:** React, Vite, React Router, TailwindCSS, Sonner, Recharts, face-api.js.
- **Testing:** Vitest, Supertest (103 pruebas E2E e integración).

---

## Guía de Inicio Rápido (De 0 a 100)

### Requisitos Previos
- **Node.js** (v20 o superior) y `npm`
- **Docker Desktop** (en ejecución si usarás Supabase en local)

---

### 1. Instalar dependencias
Desde la raíz del proyecto:
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

### 2. Levantar la instancia local de Supabase
Asegúrate de tener **Docker Desktop** abierto, entra a `backend/` y ejecuta:

```bash
cd backend
npm run supabase:start
```

La primera vez descargará las imágenes Docker de Supabase. Al finalizar, imprimirá en consola las credenciales y puertos locales:
- **PostgreSQL (`DATABASE_URL`):** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API / Auth (`SUPABASE_URL`):** `http://127.0.0.1:54321`
- **Studio UI (Panel visual de BD):** `http://127.0.0.1:54323`
- **`anon key`** y **`service_role key`** *(necesarias para el `.env`)*

#### Comandos de gestión de Supabase Local
| Comando | Acción |
|---|---|
| `npm run supabase:start` | Inicia la instancia local de Supabase en Docker |
| `npm run supabase:status` | Muestra URLs, puertos y llaves (`anon key`, `service_role key`) |
| `npm run supabase:stop` | Detiene los contenedores sin borrar los datos guardados |

> **Alternativa Cloud:** Si usas un proyecto en **Supabase Cloud**, omite este paso y coloca la URL y llaves de tu proyecto remoto en `backend/.env`.

---

### 3. Configurar Variables de Entorno

Copiar los archivos de ejemplo a `.env` en backend y frontend (ambos ya vienen preconfigurados con los valores estándar locales de Supabase):

```bash
# Backend
cp backend/.example.env backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

> **Nota:** `backend/.example.env` y `frontend/.env.example` ya incluyen las llaves y URLs predeterminadas para Supabase Local. Solo necesitas personalizar llaves de pasarela externa (`CULQI_SECRET_KEY` / `APISPERU_INVOICE_TOKEN`) si vas a realizar pruebas directas con esos servicios en la nube.

---

### 4. Crear Esquema, Seeds y Datos de Demostración

Desde la carpeta `backend/`:

#### 🚀 Comando Todo-en-Uno (Recomendado para el equipo al cambiar de rama o reiniciar estado):
```bash
npm run db:reset
```
> **¿Qué hace `npm run db:reset`?**
> 1. Purgar completamente las cuentas de **Supabase Auth** y **PostgreSQL** para evitar conflictos de usuarios huérfanos.
> 2. Reconstruir tablas, llaves foráneas, enums e índices desde cero.
> 3. Crear automáticamente el **Gerente (Manager)**.
> 4. Cargar los planes de entrenamiento, clientes demo (DNI, Carnet de Extranjería y Pasaporte), recepcionista, membresías, pagos y asistencias.
> 5. Verificar que todas las credenciales de prueba inicien sesión con éxito.

#### Comandos individuales (si requieres control granular):
```bash
# 1. Crea las tablas, índices y restricciones en PostgreSQL (también limpia Supabase Auth)
npm run db:init

# 2. Crea o sincroniza únicamente la cuenta del Gerente (entornos de producción/limpios)
npm run db:seed

# 3. Carga el set de demostración (ejecuta db:seed internamente)
npm run db:demo
```

#### Usuarios disponibles tras ejecutar `npm run db:demo`

| Rol | Correo | Contraseña | Tipo / N° Documento | Estado / Notas |
|---|---|---|---|---|
| **Gerente (`MANAGER`)** | `manager@gmail.com` | `SuperSecurePassword123!` | DNI: `00000000` | Acceso total al panel administrativo |
| **Recepcionista (`RECEPTIONIST`)** | `recepcionista@starkfit.com` | `password123` | DNI: `40556677` | Gestión de clientes, pagos y terminal de acceso |
| **Cliente (`CLIENT`)** | `juan.perez@example.com` | `password123` | DNI: `40112233` | Membresía mensual activa |
| **Cliente (`CLIENT`)** | `maria.gomez@example.com` | `password123` | Carnet Ext.: `CE00123456` | Membresía trimestral activa |
| **Cliente (`CLIENT`)** | `carlos.rodriguez@example.com` | `password123` | DNI: `40334455` | Membresía anual activa |
| **Cliente (`CLIENT`)** | `ana.torres@example.com` | `password123` | Pasaporte: `PAS998877` | Membresía mensual por vencer |

---

### 5. Iniciar Servidores de Desarrollo

Abre dos terminales:

- **Terminal 1 — Backend:**
  ```bash
  cd backend && npm run dev
  ```
  - API Base: `http://localhost:3000/api`
  - Documentación Swagger UI: `http://localhost:3000/api-docs`
  - Health check: `http://localhost:3000/api/health`

- **Terminal 2 — Frontend:**
  ```bash
  cd frontend && npm run dev
  ```
  - Aplicación Web: `http://localhost:5173`

---

## Pruebas Automatizadas

Las pruebas E2E y de integración corren con Vitest + Supertest contra la base de datos configurada en `backend/.env`:

```bash
cd backend
npm test           # Ejecuta toda la suite (103 tests)
npm run test:watch # Modo observador durante el desarrollo
```

---

## Referencia Rápida de Comandos

### Backend (`backend/`)
| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia servidor Express con recarga automática (`--watch`) |
| `npm start` | Inicia servidor Express en modo normal/producción |
| `npm test` | Ejecuta las 103 pruebas automatizadas con Vitest |
| `npm run test:watch` | Ejecuta pruebas en modo observador |
| `npm run db:init` | Crea/reinicia el esquema en PostgreSQL y purga Supabase Auth |
| `npm run db:seed` | Crea o actualiza la cuenta del Gerente inicial |
| `npm run db:demo` | Siembra usuarios demo (recepcionista y clientes), planes y asistencias |
| `npm run db:reset` | **Todo en uno:** purga Auth, reconstruye esquema y carga todos los datos demo |
| `npm run supabase:start` | Inicia los contenedores locales de Supabase (requiere Docker) |
| `npm run supabase:status` | Muestra URLs, puertos y llaves locales de Supabase |
| `npm run supabase:stop` | Detiene los contenedores locales de Supabase |

### Frontend (`frontend/`)
| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia servidor de desarrollo Vite en `http://localhost:5173` |
| `npm run build` | Compila la aplicación para producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción localmente |
