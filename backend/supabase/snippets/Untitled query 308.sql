-- 1. Eliminar la restricción actual de forma directa por su nombre
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_entry_method_check;

-- 2. Asegurarse de que los registros existentes estén actualizados
UPDATE attendances 
SET entry_method = 'acceso_manual' 
WHERE entry_method IN ('dni', 'manual');

-- 3. Crear la nueva restricción permitiendo únicamente los 3 métodos correctos
ALTER TABLE attendances 
ADD CONSTRAINT attendances_entry_method_check 
CHECK (entry_method IN ('acceso_manual', 'facial', 'qr'));