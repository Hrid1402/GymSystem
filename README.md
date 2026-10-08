# GymSystem

## Stack
### Backend
Node.js, Express, PostgreSQL, Supabase Auth, Zod (validation), Swagger (docs)

## Setup
Run all setup commands from the `backend` directory.

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. Start PostgreSQL and wait until it is ready:
    ```bash
    docker compose up -d --wait
    ```
4. Start Supabase locally:
    ```bash
    npx supabase start
    ```

    After Supabase starts, copy the Project URL, Publishable key, and Secret key from the command output into `.env`:

    ```dotenv
    SUPABASE_URL="http://127.0.0.1:54321"
    SUPABASE_ANON_KEY="<Publishable key>"
    SUPABASE_SERVICE_ROLE_KEY="<Secret key>"
    ```

    Supabase Studio is available at [http://127.0.0.1:54323](http://127.0.0.1:54323).
5. `npm run db:init`  (creates the tables)
6. `npm run db:seed`  (creates the first manager)
7. `npm run dev`

## API documentation
Swagger UI is available at `/api-docs` when the server is running.