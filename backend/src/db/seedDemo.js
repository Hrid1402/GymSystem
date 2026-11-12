import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { pool } from './index.js';
import { initializeManager } from './initManager.js';

const DEMO_USERS = [
  {
    id: 'USR-recep-01',
    email: 'recepcionista@starkfit.com',
    password: 'password123',
    firstName: 'Laura',
    lastName: 'Recepcionista',
    tipoDocumento: 'dni',
    numeroDocumento: '40556677',
    role: 'RECEPTIONIST',
    dateOfBirth: '1995-03-20',
  },
  {
    id: 'USR-client-01',
    email: 'juan.perez@example.com',
    password: 'password123',
    firstName: 'Juan',
    lastName: 'Pérez',
    tipoDocumento: 'dni',
    numeroDocumento: '40112233',
    role: 'CLIENT',
    dateOfBirth: '1996-06-15',
  },
  {
    id: 'USR-client-02',
    email: 'maria.gomez@example.com',
    password: 'password123',
    firstName: 'María',
    lastName: 'Gómez',
    tipoDocumento: 'carnet_extranjeria',
    numeroDocumento: 'CE00123456',
    role: 'CLIENT',
    dateOfBirth: '1998-09-22',
  },
  {
    id: 'USR-client-03',
    email: 'carlos.rodriguez@example.com',
    password: 'password123',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    tipoDocumento: 'dni',
    numeroDocumento: '40334455',
    role: 'CLIENT',
    dateOfBirth: '1994-11-05',
  },
  {
    id: 'USR-client-04',
    email: 'ana.torres@example.com',
    password: 'password123',
    firstName: 'Ana',
    lastName: 'Torres',
    tipoDocumento: 'pasaporte',
    numeroDocumento: 'PAS998877',
    role: 'CLIENT',
    dateOfBirth: '2001-04-18',
  },
];

export async function seedDemoData({ closePool = true } = {}) {
  console.log('--- Iniciando Seed Demo GymStark ---');

  // 1. Limpieza rigurosa de datos transaccionales previos
  console.log('Limpiando datos transaccionales y usuarios demo...');
  await pool.query('DELETE FROM attendances');
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM memberships');
  await pool.query("DELETE FROM users WHERE role != 'MANAGER'");
  await pool.query('DELETE FROM plans');

  // Limpieza en Supabase Auth de usuarios previos distintos al Manager
  const managerEmail = (process.env.INITIAL_MANAGER_EMAIL || 'manager@gmail.com').trim().toLowerCase();
  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of listData?.users || []) {
      if (u.email && u.email.toLowerCase() !== managerEmail) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
      }
    }
    console.log('✓ Cuentas temporales de Supabase Auth depuradas.');
  } catch (authErr) {
    console.warn('Advertencia depurando Supabase Auth:', authErr.message);
  }

  // 2. Ejecutar inicialización del Manager (garantiza que exista en Auth y DB)
  console.log('Verificando / Inicializando cuenta del Manager...');
  await initializeManager({ closePool: false });

  // 3. Crear los 3 planes de entrenamiento
  await pool.query(`
    INSERT INTO plans (id, name, description, price, duration_days, is_active)
    VALUES 
      ('PLN-mensual-01', 'Plan Mensual Estándar', 'Acceso completo por 30 días', 90.00, 30, true),
      ('PLN-trimestral-01', 'Plan Trimestral Pro', 'Acceso completo por 90 días con descuento', 240.00, 90, true),
      ('PLN-anual-01', 'Plan Anual Elite', 'Acceso ilimitado por 365 días', 800.00, 365, true)
    ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;
  `);
  console.log('✓ Planes creados.');

  // 4. Crear usuarios en Supabase Auth y en public.users
  const { data: currentAuthUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const authUserMap = new Map((currentAuthUsers?.users || []).map((u) => [u.email?.toLowerCase(), u.id]));

  for (const demoUser of DEMO_USERS) {
    let supabaseId = authUserMap.get(demoUser.email.toLowerCase());

    if (!supabaseId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true,
      });
      if (error) {
        console.error(`Error creando ${demoUser.email}:`, error.message);
        continue;
      }
      supabaseId = data.user.id;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
        password: demoUser.password,
        email_confirm: true,
      });
    }

    await pool.query(
      `
      INSERT INTO users (id, supabase_user_id, tipo_documento, numero_documento, first_name, last_name, email, role, date_of_birth, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      ON CONFLICT (id) DO UPDATE 
      SET supabase_user_id = EXCLUDED.supabase_user_id,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          tipo_documento = EXCLUDED.tipo_documento,
          numero_documento = EXCLUDED.numero_documento,
          date_of_birth = EXCLUDED.date_of_birth,
          is_active = true
    `,
      [
        demoUser.id,
        supabaseId,
        demoUser.tipoDocumento,
        demoUser.numeroDocumento,
        demoUser.firstName,
        demoUser.lastName,
        demoUser.email,
        demoUser.role,
        demoUser.dateOfBirth,
      ]
    );
  }
  console.log('✓ Usuarios demo creados en Supabase Auth y PostgreSQL.');

  // 5. Crear Membresías para los clientes demo
  await pool.query(`
    INSERT INTO memberships (id, user_id, plan_id, start_date, end_date, status)
    VALUES 
      ('MBS-cl-01', 'USR-client-01', 'PLN-mensual-01', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'ACTIVE'),
      ('MBS-cl-02', 'USR-client-02', 'PLN-trimestral-01', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '3 days', 'ACTIVE'),
      ('MBS-cl-03', 'USR-client-03', 'PLN-anual-01', CURRENT_DATE - INTERVAL '100 days', CURRENT_DATE + INTERVAL '265 days', 'ACTIVE'),
      ('MBS-cl-04', 'USR-client-04', 'PLN-mensual-01', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '2 days', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, end_date = EXCLUDED.end_date;
  `);
  console.log('✓ Membresías creadas.');

  // 6. Crear Pagos Históricos para alimentar los gráficos de ingresos
  await pool.query(`
    INSERT INTO payments (id, user_id, plan_id, preference_id, status, amount, currency_id, membership_id, created_at)
    VALUES 
      ('PAY-HIST-01', 'USR-client-01', 'PLN-mensual-01', 'pref-h1', 'approved', 90.00, 'PEN', 'MBS-cl-01', '2026-01-15 10:00:00'),
      ('PAY-HIST-02', 'USR-client-02', 'PLN-trimestral-01', 'pref-h2', 'approved', 240.00, 'PEN', 'MBS-cl-02', '2026-02-20 11:30:00'),
      ('PAY-HIST-03', 'USR-client-03', 'PLN-anual-01', 'pref-h3', 'approved', 800.00, 'PEN', 'MBS-cl-03', '2026-03-10 14:00:00'),
      ('PAY-HIST-04', 'USR-client-01', 'PLN-mensual-01', 'pref-h4', 'approved', 90.00, 'PEN', 'MBS-cl-01', '2026-04-05 09:15:00'),
      ('PAY-HIST-05', 'USR-client-02', 'PLN-trimestral-01', 'pref-h5', 'approved', 240.00, 'PEN', 'MBS-cl-02', '2026-05-18 16:45:00'),
      ('PAY-HIST-06', 'USR-client-03', 'PLN-anual-01', 'pref-h6', 'approved', 800.00, 'PEN', 'MBS-cl-03', '2026-06-22 12:00:00'),
      ('PAY-HIST-07', 'USR-client-01', 'PLN-mensual-01', 'pref-h7', 'approved', 90.00, 'PEN', 'MBS-cl-01', '2026-07-30 18:30:00'), 
      ('PAY-HIST-08', 'USR-client-04', 'PLN-mensual-01', 'pref-h8', 'approved', 90.00, 'PEN', 'MBS-cl-04', '2026-08-01 08:00:00'), 
      ('PAY-HIST-09', 'USR-client-02', 'PLN-trimestral-01', 'pref-h9', 'approved', 240.00, 'PEN', 'MBS-cl-02', '2026-09-30 21:00:00'), 
      ('PAY-HIST-10', 'USR-client-03', 'PLN-anual-01', 'pref-h10', 'approved', 800.00, 'PEN', 'MBS-cl-03', '2026-10-01 07:30:00'),
      ('PAY-HIST-11', 'USR-client-01', 'PLN-mensual-01', 'pref-h11', 'approved', 90.00, 'PEN', 'MBS-cl-01', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✓ Pagos históricos registrados.');

  // 7. Generar Asistencias de demostración
  await pool.query(`
    INSERT INTO attendances (id, user_id, membership_id, registered_by, entry_method, created_at)
    SELECT 
      'att-' || substring(md5(random()::text || clock_timestamp()::text || m.id), 1, 20), 
      m.user_id, 
      m.id, 
      'USR-recep-01', 
      CASE WHEN (random() > 0.4) THEN 'qr' ELSE 'acceso_manual' END,
      (NOW() - (INTERVAL '1 day' * floor(random() * 25)::int)) + (INTERVAL '1 hour' * h.hour_val)
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    CROSS JOIN (
      VALUES (8), (9), (12), (17), (18), (19), (20)
    ) AS h(hour_val)
    WHERE m.status = 'ACTIVE' AND u.role = 'CLIENT'
    LIMIT 50;
  `);
  console.log('✓ 50 asistencias generadas.');

  // 8. Verificar credenciales para asegurar que los inicios de sesión funcionen de inmediato
  console.log('--- Verificando credenciales de acceso ---');
  const { supabase } = await import('../lib/supabaseClient.js');
  const accountsToVerify = [
    { email: managerEmail, pass: process.env.INITIAL_MANAGER_PASSWORD || 'SuperSecurePassword123!' },
    ...DEMO_USERS.map((u) => ({ email: u.email, pass: u.password })),
  ];

  for (const acc of accountsToVerify) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.pass,
    });
    if (error) {
      console.log(`❌ ${acc.email}: ${error.message}`);
    } else {
      console.log(`✅ ${acc.email} (${data.user.email}): Login OK`);
    }
  }

  if (closePool) {
    await pool.end();
  }
  console.log('--- ¡Base de Datos Lista para Demostración y Pruebas! ---');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  seedDemoData({ closePool: true }).catch((err) => {
    console.error('Error en seed:', err);
    process.exit(1);
  });
}


