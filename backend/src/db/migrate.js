import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

/**
 * Idempotent production migration script.
 * Safe to run on every CD deploy: creates missing tables/indexes and adds new columns
 * without ever dropping existing tables or deleting user data.
 */
export const runMigrations = async ({ closePool = true } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(30) PRIMARY KEY,
        supabase_user_id UUID UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'RECEPTIONIST', 'CLIENT', 'TRAINER')),
        tipo_documento VARCHAR(20),
        numero_documento VARCHAR(20),
        phone VARCHAR(30),
        date_of_birth DATE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_documento_unique
        ON users(tipo_documento, numero_documento)
        WHERE tipo_documento IS NOT NULL AND numero_documento IS NOT NULL;

      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
        duration_days INTEGER NOT NULL CHECK (duration_days > 0),
        nivel_clases VARCHAR(20) NOT NULL DEFAULT 'ninguna' CHECK (nivel_clases IN ('ninguna', 'basicas', 'todas')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE plans
        ADD COLUMN IF NOT EXISTS nivel_clases VARCHAR(20) NOT NULL DEFAULT 'ninguna';

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'plans' AND column_name = 'acceso_clases'
        ) THEN
          UPDATE plans
          SET nivel_clases = 'todas'
          WHERE acceso_clases = true
            AND nivel_clases = 'ninguna'
            AND (name ILIKE '%anual%' OR name ILIKE '%elite%');

          UPDATE plans
          SET nivel_clases = 'basicas'
          WHERE acceso_clases = true
            AND nivel_clases = 'ninguna';
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS memberships (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(30) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_active_membership_per_user
        ON memberships(user_id) WHERE status = 'ACTIVE';

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(30) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        membership_id VARCHAR(30) REFERENCES memberships(id) ON DELETE SET NULL,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        currency_id VARCHAR(10) NOT NULL DEFAULT 'PEN',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        status_detail VARCHAR(100),
        payment_method_id VARCHAR(50),
        culqi_charge_id VARCHAR(100) UNIQUE,
        mp_payment_id VARCHAR(100) UNIQUE,
        mp_preference_id VARCHAR(100),
        external_reference VARCHAR(100),
        registered_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_serie_correlativo ON invoices(serie, correlativo);
      CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(30) PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        membership_id VARCHAR(30) REFERENCES memberships(id) ON DELETE SET NULL,
        registered_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL,
        entry_method VARCHAR(50) CHECK (entry_method IN ('qr', 'manual_dni', 'acceso_manual', 'facial', 'face', 'manual', 'dni', 'biometric')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        exited_at TIMESTAMP WITH TIME ZONE,
        exit_method VARCHAR(50),
        exit_registered_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL
      );

      ALTER TABLE attendances
        ADD COLUMN IF NOT EXISTS exited_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS exit_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS exit_registered_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON attendances(created_at);

      CREATE TABLE IF NOT EXISTS gym_settings (
        id VARCHAR(30) PRIMARY KEY DEFAULT 'default',
        max_capacity INTEGER NOT NULL DEFAULT 50 CHECK (max_capacity > 0),
        total_rooms INTEGER NOT NULL DEFAULT 5 CHECK (total_rooms > 0),
        opening_time TIME NOT NULL DEFAULT '06:00:00',
        closing_time TIME NOT NULL DEFAULT '22:00:00',
        is_configured BOOLEAN NOT NULL DEFAULT false,
        terms_accepted_at TIMESTAMP WITH TIME ZONE,
        configured_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT gym_operating_hours_valid CHECK (closing_time > opening_time)
      );

      ALTER TABLE gym_settings
        ADD COLUMN IF NOT EXISTS total_rooms INTEGER NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS opening_time TIME NOT NULL DEFAULT '06:00:00',
        ADD COLUMN IF NOT EXISTS closing_time TIME NOT NULL DEFAULT '22:00:00',
        ADD COLUMN IF NOT EXISTS is_configured BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS configured_by VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS client_facials (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(30) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        embedding JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_client_facials_user_id ON client_facials(user_id);

      CREATE TABLE IF NOT EXISTS trainer_profiles (
        user_id VARCHAR(30) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        specialty VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS class_catalog (
        id VARCHAR(30) PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('basica', 'especializada')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(30) PRIMARY KEY,
        catalog_id VARCHAR(30) REFERENCES class_catalog(id) ON DELETE RESTRICT,
        nombre_clase VARCHAR(150) NOT NULL,
        categoria VARCHAR(20) NOT NULL DEFAULT 'basica' CHECK (categoria IN ('basica', 'especializada')),
        descripcion TEXT,
        entrenador_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        sala VARCHAR(100) NOT NULL,
        dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo > 0),
        estado VARCHAR(30) NOT NULL DEFAULT 'activa',
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT rango_horas_valido CHECK (hora_fin > hora_inicio)
      );

      ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS catalog_id VARCHAR(30) REFERENCES class_catalog(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'basica',
        ADD COLUMN IF NOT EXISTS dia_semana SMALLINT;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'classes' AND column_name = 'fecha_clase'
        ) THEN
          ALTER TABLE classes ALTER COLUMN fecha_clase DROP NOT NULL;
          UPDATE classes
          SET dia_semana = COALESCE(dia_semana, EXTRACT(DOW FROM fecha_clase)::smallint, 1)
          WHERE dia_semana IS NULL;
        ELSE
          UPDATE classes SET dia_semana = 1 WHERE dia_semana IS NULL;
        END IF;

        ALTER TABLE classes ALTER COLUMN dia_semana SET NOT NULL;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_classes_entrenador ON classes(entrenador_id);
      CREATE INDEX IF NOT EXISTS idx_classes_dia_semana ON classes(dia_semana);

      CREATE TABLE IF NOT EXISTS class_enrollments (
        id VARCHAR(30) PRIMARY KEY,
        class_id VARCHAR(30) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        client_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fecha_sesion DATE NOT NULL,
        inscrito_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (class_id, client_id, fecha_sesion)
      );

      ALTER TABLE class_enrollments
        ADD COLUMN IF NOT EXISTS fecha_sesion DATE;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM class_enrollments WHERE fecha_sesion IS NULL
        ) THEN
          UPDATE class_enrollments SET fecha_sesion = CURRENT_DATE WHERE fecha_sesion IS NULL;
        END IF;
        ALTER TABLE class_enrollments ALTER COLUMN fecha_sesion SET NOT NULL;
        ALTER TABLE class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_class_id_client_id_key;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_class_enrollments_unique_session
        ON class_enrollments(class_id, client_id, fecha_sesion);
      CREATE INDEX IF NOT EXISTS idx_class_enrollments_client ON class_enrollments(client_id, class_id, fecha_sesion);
      CREATE INDEX IF NOT EXISTS idx_class_enrollments_session ON class_enrollments(class_id, fecha_sesion);

      INSERT INTO class_catalog (id, nombre, categoria, is_active) VALUES
        ('CAT-zumba-01', 'Zumba', 'basica', true),
        ('CAT-baile-01', 'Baile Fitness', 'basica', true),
        ('CAT-aerobicos-01', 'Aeróbicos', 'basica', true),
        ('CAT-estiramiento-01', 'Estiramiento y Movilidad', 'basica', true),
        ('CAT-spinning-01', 'Spinning', 'especializada', true),
        ('CAT-crossfit-01', 'Crossfit Funcional', 'especializada', true),
        ('CAT-yoga-01', 'Yoga & Flexibilidad', 'especializada', true),
        ('CAT-boxeo-01', 'Boxeo Fitness', 'especializada', true)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('Production migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
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
  runMigrations({ closePool: true }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
