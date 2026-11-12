import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';

export const purgeAuthUsers = async () => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.warn('Advertencia consultando Supabase Auth:', error.message);
      return;
    }
    const users = data?.users || [];
    if (users.length > 0) {
      console.log(`Purgando ${users.length} cuenta(s) previas de Supabase Auth...`);
      for (const u of users) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(u.id);
        } catch (delErr) {
          // Ignorar si ya fue removido
        }
      }
      console.log('✓ Supabase Auth completamente depurado.');
    } else {
      console.log('✓ Supabase Auth no tenía cuentas previas.');
    }
  } catch (err) {
    console.warn('Advertencia depurando Supabase Auth vía Admin API:', err.message);
  }
};

export const buildSchema = async ({ closePool = true, cleanAuth = true } = {}) => {
  if (cleanAuth) {
    await purgeAuthUsers();
  }

  const client = await pool.connect();

  try {
    console.log('Building database schema...');
    await client.query('BEGIN');

    // Limpiar auth.users en PostgreSQL si existe el esquema auth
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
          DELETE FROM auth.users;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // Drop tables and types in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS client_facials CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS attendances CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS memberships CASCADE;
      DROP TABLE IF EXISTS plans CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS membership_status CASCADE;
      DROP TYPE IF EXISTS payment_status CASCADE;
    `);

    // Define Enums
    // To add a role later: ALTER TYPE user_role ADD VALUE 'TRAINER';
    await client.query(`
      CREATE TYPE user_role AS ENUM ('CLIENT', 'RECEPTIONIST', 'MANAGER');
      CREATE TYPE membership_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
      CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back');
    `);

    // Define Tables
    await client.query(`
      CREATE TABLE users (
        id VARCHAR(30) PRIMARY KEY,
        supabase_user_id UUID UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        tipo_documento VARCHAR(50) NOT NULL DEFAULT 'dni',
        numero_documento VARCHAR(30) UNIQUE NOT NULL,
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

      CREATE TABLE payments (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(30) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        preference_id VARCHAR(255) UNIQUE,
        mp_payment_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        status_detail TEXT,
        amount NUMERIC(10, 2) NOT NULL,
        currency_id VARCHAR(10) NOT NULL DEFAULT 'PEN',
        payment_method_id VARCHAR(100),
        payment_type_id VARCHAR(100),
        membership_id VARCHAR(30) REFERENCES memberships(id) ON DELETE SET NULL,
        init_point TEXT,
        sandbox_init_point TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_payments_user_id ON payments(user_id);
      CREATE INDEX idx_payments_preference_id ON payments(preference_id);
      CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id);

      CREATE TABLE invoices (
        id VARCHAR(30) PRIMARY KEY,
        payment_id VARCHAR(30) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo_doc VARCHAR(2) NOT NULL,
        serie VARCHAR(4) NOT NULL,
        correlativo INTEGER NOT NULL,
        fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        client_tipo_doc VARCHAR(2) NOT NULL,
        client_num_doc VARCHAR(20) NOT NULL,
        client_rzn_social VARCHAR(255) NOT NULL,
        client_address TEXT,
        mto_oper_gravadas NUMERIC(10, 2) NOT NULL,
        mto_igv NUMERIC(10, 2) NOT NULL,
        total_venta NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        sunat_response JSONB,
        ubl_payload JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX idx_invoices_serie_correlativo ON invoices(serie, correlativo);
      CREATE INDEX idx_invoices_payment_id ON invoices(payment_id);
      CREATE INDEX idx_invoices_user_id ON invoices(user_id);

      CREATE TABLE attendances (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        membership_id VARCHAR(30) REFERENCES memberships(id) ON DELETE SET NULL,
        registered_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL,
        entry_method VARCHAR(50) CHECK (entry_method IN ('qr', 'manual_dni', 'acceso_manual', 'facial', 'face', 'manual', 'dni', 'biometric')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_attendances_user_id ON attendances(user_id);
      CREATE INDEX idx_attendances_created_at ON attendances(created_at);

      CREATE TABLE client_facials (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        embedding JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_client_facials_user_id ON client_facials(user_id);

      -- Si la base de datos es de Supabase (existe el esquema auth.users), vincular con foreign key y borrado en cascada
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
          ALTER TABLE users
            DROP CONSTRAINT IF EXISTS fk_users_supabase_auth;
          ALTER TABLE users
            ADD CONSTRAINT fk_users_supabase_auth
            FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('Schema created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error building schema:', error);
    if (closePool) process.exit(1);
    throw error;
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  buildSchema({ closePool: true, cleanAuth: true }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

