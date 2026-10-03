# GymSystem

## Stack
### Backend
Node.js, Express, PostgreSQL, Supabase Auth, Zod (validation), Swagger (docs)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. `docker compose up -d --wait`  (starts PostgreSQL and waits until it's ready)
4. `npm run db:init`  (creates the tables)
5. `npm run db:seed`  (creates the first manager)
6. `npm run dev`

## API documentation
Swagger UI is available at `/api-docs` when the server is running.