import 'dotenv/config';
import { pool } from './index.js';

const buildSchema = async () => {
  const client = await pool.connect();

  try {
    console.log('Building database schema...');
    await client.query('BEGIN');

    // Drop tables and types in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS memberships CASCADE;
      DROP TABLE IF EXISTS plans CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS membership_status CASCADE;
    `);

    // Define Enums
    // To add a role later: ALTER TYPE user_role ADD VALUE 'TRAINER';
    await client.query(`
      CREATE TYPE user_role AS ENUM ('CLIENT', 'RECEPTIONIST', 'MANAGER');
      CREATE TYPE membership_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
    `);

    // Define Tables
    await client.query(`
      CREATE TABLE users (
        id VARCHAR(30) PRIMARY KEY,
        supabase_user_id UUID UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        dni VARCHAR(20) UNIQUE NOT NULL,
        phone VARCHAR(50),
        date_of_birth DATE,
        role user_role NOT NULL DEFAULT 'CLIENT',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE plans (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
        duration_days INTEGER NOT NULL CHECK (duration_days > 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE memberships (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(30) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status membership_status DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Only one active membership per user
      CREATE UNIQUE INDEX one_active_membership_per_user
        ON memberships (user_id) WHERE status = 'ACTIVE';
    `);

    await client.query('COMMIT');
    console.log('Schema created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error building schema:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

buildSchema();