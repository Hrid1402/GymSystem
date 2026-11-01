-- =========================================================================
-- SCRIPT SQL MAESTRO DE DATOS DE PRUEBA (GYMSTARK - CORREGIDO)
-- =========================================================================

-- 0. Limpieza previa en orden estricto de dependencia (hijos -> padres)
DELETE FROM attendances;
DELETE FROM payments;
DELETE FROM memberships;
DELETE FROM users WHERE role = 'CLIENT';
DELETE FROM plans; 

-- 1. CREAR PLANES DE PRUEBA
INSERT INTO plans (id, name, description, price, duration_days, is_active)
VALUES 
  ('PLN-mensual-01', 'Plan Mensual Estándar', 'Acceso completo por 30 días', 90.00, 30, true),
  ('PLN-trimestral-01', 'Plan Trimestral Pro', 'Acceso completo por 90 días con descuento', 240.00, 90, true),
  ('PLN-anual-01', 'Plan Anual Elite', 'Acceso ilimitado por 365 días', 800.00, 365, true);

-- 2. CREAR USUARIOS EN AUTH.USERS (Para satisfacer la llave foránea de Supabase)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juan.perez@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.gomez@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carlos.rodriguez@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.torres@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. CREAR CLIENTES DE PRUEBA EN PUBLIC.USERS
INSERT INTO users (id, supabase_user_id, dni, first_name, last_name, email, role, is_active)
VALUES 
  ('USR-client-01', '11111111-1111-1111-1111-111111111101', '40112233', 'Juan', 'Pérez', 'juan.perez@example.com', 'CLIENT', true),
  ('USR-client-02', '11111111-1111-1111-1111-111111111102', '40223344', 'María', 'Gómez', 'maria.gomez@example.com', 'CLIENT', true),
  ('USR-client-03', '11111111-1111-1111-1111-111111111103', '40334455', 'Carlos', 'Rodríguez', 'carlos.rodriguez@example.com', 'CLIENT', true),
  ('USR-client-04', '11111111-1111-1111-1111-111111111104', '40445566', 'Ana', 'Torres', 'ana.torres@example.com', 'CLIENT', true)
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, dni = EXCLUDED.dni;

-- 4. CREAR MEMBRESÍAS (Incluye 2 próximas a vencer en menos de 7 días)
INSERT INTO memberships (id, user_id, plan_id, start_date, end_date, status)
VALUES 
  ('MBS-cl-01', 'USR-client-01', 'PLN-mensual-01', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'ACTIVE'),
  ('MBS-cl-02', 'USR-client-02', 'PLN-trimestral-01', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '3 days', 'ACTIVE'),
  ('MBS-cl-03', 'USR-client-03', 'PLN-anual-01', CURRENT_DATE - INTERVAL '100 days', CURRENT_DATE + INTERVAL '265 days', 'ACTIVE'),
  ('MBS-cl-04', 'USR-client-04', 'PLN-mensual-01', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '2 days', 'ACTIVE')
ON CONFLICT (id) DO UPDATE 
SET status = EXCLUDED.status, end_date = EXCLUDED.end_date;

-- 5. CREAR PAGOS HISTÓRICOS
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
  ('PAY-HIST-10', 'USR-client-03', 'PLN-anual-01', 'pref-h10', 'approved', 800.00, 'PEN', 'MBS-cl-03', '2026-10-01 07:30:00')
ON CONFLICT (id) DO NOTHING;

-- 6. GENERAR ACCESOS VÁLIDOS (ID acortado a máximo 30 caracteres para cumplir con VARCHAR(30))
INSERT INTO attendances (id, user_id, membership_id, registered_by, entry_method, created_at)
SELECT 
  'att-' || substring(md5(random()::text || clock_timestamp()::text || m.id), 1, 20), 
  m.user_id, 
  m.id, 
  m.user_id, 
  CASE WHEN (random() > 0.4) THEN 'qr' ELSE 'manual_dni' END,
  (NOW() - (INTERVAL '1 day' * floor(random() * 25)::int)) + (INTERVAL '1 hour' * h.hour_val)
FROM memberships m
JOIN users u ON m.user_id = u.id
CROSS JOIN (
  VALUES (8), (9), (12), (17), (18), (19), (20)
) AS h(hour_val)
WHERE m.status = 'ACTIVE' AND u.role = 'CLIENT'
LIMIT 50;