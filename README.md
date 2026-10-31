# GymSystem (GymStark)

Plataforma de gestión integral para gimnasios.

## Tech Stack
- **Backend:** Node.js, Express, Supabase (PostgreSQL & Auth), Mercado Pago SDK v3 (Checkout Pro), Zod, Swagger/OpenAPI.
- **Frontend:** React, Vite, React Router DOM, js-cookie, Sonner.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina:
- **Node.js** (v20 o superior recomendado) y `npm`.
- **Git**.
- **Docker Desktop**: Requerido únicamente si vas a ejecutar Supabase de forma local. Debe estar abierto y en ejecución antes de levantar los contenedores. *(Si utilizas un proyecto de Supabase Cloud, no requieres Docker)*.

---

## 🚀 Guía de Instalación (de 0 a 100)

### Paso 1: Dependencias del Backend
Abre una terminal y entra a la carpeta `backend`:
```bash
cd backend
npm install
```

### Paso 2: Levantar Supabase (Base de Datos y Auth)
El backend utiliza **Supabase de forma unificada**, por lo que tanto las tablas del negocio como la autenticación viven en la misma instancia de PostgreSQL.

#### Opción A: Supabase Local (Recomendado para desarrollo)
1. Inicia **Docker Desktop** y espera a que esté activo.
2. En la carpeta `backend`, ejecuta:
   ```bash
   npm run supabase:start
   ```
   *(La primera vez puede tardar unos minutos mientras descarga las imágenes)*.
3. Al finalizar, la consola imprimirá las URLs y claves de desarrollo:
   - **PostgreSQL:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - **API / Auth URL:** `http://127.0.0.1:54321`
   - **Supabase Studio (Dashboard local):** `http://127.0.0.1:54323`
   - **anon key** y **service_role key**: Claves JWT mostradas en la terminal.

#### Opción B: Supabase Cloud
Si prefieres no usar Docker, puedes crear un proyecto gratuito en [supabase.com](https://supabase.com) y usar las credenciales de tu proyecto.

---

### Paso 3: Configurar Variables de Entorno del Backend
En la carpeta `backend`, copia la plantilla de entorno:
```bash
cp .example.env .env
```
Abre `.env` y asegúrate de configurar los valores:
- `DATABASE_URL`: Cadena de conexión a Postgres (`127.0.0.1:54322` en local o tu pooler de Supabase Cloud).
- `SUPABASE_URL`: `http://127.0.0.1:54321` (en local) o la URL de tu proyecto Cloud.
- `SUPABASE_ANON_KEY`: Llave pública anon.
- `SUPABASE_SERVICE_ROLE_KEY`: Llave privada service role (usada por el backend para gestión de usuarios).
- `INITIAL_MANAGER_*`: Correo y contraseña que se asignarán a la cuenta inicial de Gerente.
- `MERCADO_PAGO_ACCESS_TOKEN` y `MP_WEBHOOK_URL`: Opcionales en etapas iniciales; requeridos para procesar pagos con Checkout Pro.

---

### Paso 4: Inicializar Tablas y Sembrar el Gerente Inicial
Con la base de datos accesible, ejecuta en `backend`:
1. **Crear esquema de base de datos:**
   ```bash
   npm run db:init
   ```
   *(Crea las tablas de roles, planes, usuarios, membresías, asistencias y pagos, vinculando la integridad referencial con `auth.users`)*.

2. **Crear usuario Gerente inicial (Manager):**
   ```bash
   npm run db:seed
   ```
   *(Crea o sincroniza la cuenta especificada en `INITIAL_MANAGER_EMAIL` con rol MANAGER tanto en Supabase Auth como en la base de datos)*.

---

### Paso 5: Iniciar el Servidor Backend
En `backend`:
```bash
npm run dev
```
- **API Server:** `http://localhost:3000`
- **Documentación Swagger UI:** `http://localhost:3000/api-docs`
- **Health Check:** `http://localhost:3000/api/health`

---

### Paso 6: Configurar y Levantar el Frontend
Abre una segunda terminal y entra a `frontend`:
```bash
cd frontend
npm install
```

Copia el archivo de variables de entorno:
```bash
cp .env.example .env
```
*(Verifica que `VITE_API_URL` apunte a `http://localhost:3000/api`)*.

Inicia el entorno de desarrollo:
```bash
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

---

## 🛠️ Comandos Útiles de Supabase CLI
Ejecutables desde la carpeta `backend`:
- `npm run supabase:status`: Consulta el estado de los servicios locales y vuelve a imprimir las claves y URLs.
- `npm run supabase:stop`: Detiene los contenedores de Supabase al terminar tu jornada de trabajo.
- `npx supabase studio`: Abre la interfaz web de gestión visual de la base de datos.
