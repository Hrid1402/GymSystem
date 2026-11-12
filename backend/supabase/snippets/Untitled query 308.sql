-- ==============================================================================
-- SCRIPT COMPLETO: 9 USUARIOS (3 DNI, 3 C.E., 3 PASAPORTE) CON MEMBRESÍA ACTIVA
-- ==============================================================================

-- 1. Insertar en el sistema de autenticación de Supabase (auth.users)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role)
VALUES 
  -- DNI
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000000', 'carlos.mendoza@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', '00000000-0000-0000-0000-000000000000', 'lucia.fernandez@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', '00000000-0000-0000-0000-000000000000', 'mateo.gomez@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  
  -- Carné de Extranjería (C.E.)
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', '00000000-0000-0000-0000-000000000000', 'jon.doe@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', '00000000-0000-0000-0000-000000000000', 'marie.curie@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', '00000000-0000-0000-0000-000000000000', 'hans.gruber@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),

  -- Pasaporte
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', '00000000-0000-0000-0000-000000000000', 'alex.smith@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380b88', '00000000-0000-0000-0000-000000000000', 'yuki.tanaka@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
  ('c8eebc99-9c0b-4ef8-bb6d-6bb9bd380c99', '00000000-0000-0000-0000-000000000000', 'chloe.bernard@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar el plan de membresía base
INSERT INTO plans (id, name, duration_days, price, description, is_active, created_at, updated_at)
VALUES 
  ('plan_mensual_01', 'Plan Mensual Full Access', 30, 99.00, 'Acceso ilimitado por 30 días', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar los clientes en la tabla pública 'users' (con tipo y número de documento)
INSERT INTO users (id, supabase_user_id, email, first_name, last_name, tipo_documento, numero_documento, phone, role, is_active, created_at, updated_at)
VALUES 
  -- DNI
  ('usr_cliente_01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'carlos.mendoza@test.com', 'Carlos', 'Mendoza Pérez', 'dni', '71234567', '987654321', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_02', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'lucia.fernandez@test.com', 'Lucía', 'Fernández Torres', 'dni', '78901234', '912345678', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_03', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'mateo.gomez@test.com', 'Mateo', 'Gómez Ruiz', 'dni', '74567890', '934567890', 'CLIENT', TRUE, NOW(), NOW()),

  -- Carné de Extranjería (C.E.)
  ('usr_cliente_04', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'jon.doe@test.com', 'Jon', 'Doe Smith', 'carnet_extranjeria', '000123456', '955443322', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_05', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'marie.curie@test.com', 'Marie', 'Curie Sklodowska', 'carnet_extranjeria', '000987654', '966554433', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_06', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'hans.gruber@test.com', 'Hans', 'Gruber Miller', 'carnet_extranjeria', '000456789', '977665544', 'CLIENT', TRUE, NOW(), NOW()),

  -- Pasaporte
  ('usr_cliente_07', 'a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'alex.smith@test.com', 'Alex', 'Smith Johnson', 'pasaporte', 'AB123456', '988776655', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_08', 'b7eebc99-9c0b-4ef8-bb6d-6bb9bd380b88', 'yuki.tanaka@test.com', 'Yuki', 'Tanaka Sato', 'pasaporte', 'XY987654', '999887766', 'CLIENT', TRUE, NOW(), NOW()),
  ('usr_cliente_09', 'c8eebc99-9c0b-4ef8-bb6d-6bb9bd380c99', 'chloe.bernard@test.com', 'Chloé', 'Bernard Dupont', 'pasaporte', 'P654321Z', '911223344', 'CLIENT', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Asignarles membresías activas a los 9 usuarios
INSERT INTO memberships (id, user_id, plan_id, start_date, end_date, status, created_at, updated_at)
VALUES 
  ('memb_01', 'usr_cliente_01', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_02', 'usr_cliente_02', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_03', 'usr_cliente_03', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_04', 'usr_cliente_04', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_05', 'usr_cliente_05', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_06', 'usr_cliente_06', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_07', 'usr_cliente_07', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_08', 'usr_cliente_08', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
  ('memb_09', 'usr_cliente_09', 'plan_mensual_01', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;