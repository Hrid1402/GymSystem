# GymSystem

Gym management platform (**GymStark**).

## Tech Stack
- **Backend:** Node.js, Express, PostgreSQL, Supabase Auth, Mercado Pago SDK v3 (Checkout Pro), Zod, Swagger/OpenAPI.
- **Frontend:** React, Vite, React Router DOM, js-cookie, Sonner.

---

## 🛠️ Backend Setup

Run all commands from the `backend` directory:

```bash
cd backend
npm install
```

### 1. Environment Variables
Copy `.example.env` to `.env`:
```bash
cp .example.env .env
```
Fill in the required values:
- **Database:** `DATABASE_URL` (PostgreSQL local or Docker).
- **Supabase Auth:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Mercado Pago Checkout Pro:**
  - `MERCADO_PAGO_ACCESS_TOKEN`: Production or test access token from Mercado Pago Developers.
  - `MP_WEBHOOK_URL`: Public HTTPS webhook URL (in development use `ngrok http 3000`).

### 2. Database & Seeds
1. Start containers (if using Docker):
   ```bash
   docker compose up -d --wait
   ```
2. Initialize tables:
   ```bash
   npm run db:init
   ```
3. Seed the initial Manager account:
   ```bash
   npm run db:seed
   ```

### 3. Start the Server
```bash
npm run dev
```
- **Server:** `http://localhost:3000`
- **Interactive Documentation (Swagger UI):** `http://localhost:3000/api-docs`
- **Health Check:** `http://localhost:3000/api/health`


---

## 💻 Frontend Setup

Run all commands from the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```
The frontend dev server runs at `http://localhost:5173`.