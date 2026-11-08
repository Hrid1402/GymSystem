-- 1. Eliminar la restricción actual de métodos de entrada
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_entry_method_check;

-- 2. Volver a crearla permitiendo 'qr', 'manual_dni', 'facial' y 'face'
ALTER TABLE attendances ADD CONSTRAINT attendances_entry_method_check 
CHECK (entry_method IN ('qr', 'manual_dni', 'facial', 'face'));