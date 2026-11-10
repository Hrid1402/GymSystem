-- 1. Agregar la columna para el tipo de documento en español (si no existe)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50) DEFAULT 'dni';

-- 2. Asegurar que la columna física que almacena el número se llame 'numero_documento' 
-- (Si tu tabla actualmente usa 'dni', puedes renombrarla o asegurarte de usar 'numero_documento')
-- O si prefieres mantener la columna 'dni' pero que actúe como el número, la renombramos por claridad:
DO $$ 
BEGIN 
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' and column_name='dni') THEN
        ALTER TABLE users RENAME COLUMN dni TO numero_documento;
    END IF;
END $$;

-- 3. Eliminar restricciones antiguas de unicidad si existían
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_dni_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_doc_type_number_unique;

-- 4. Crear la restricción única basada en la combinación de tipo y número de documento en español
ALTER TABLE users ADD CONSTRAINT users_tipo_numero_doc_unique UNIQUE (tipo_documento, numero_documento);