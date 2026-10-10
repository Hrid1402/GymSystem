-- CDAAG-218: Restricciones de datos para autenticacion

BEGIN;

--Usuarios sin estado definido permaneceran sin acceso
UPDATE users
SET is_active = FALSE
WHERE is_active IS NULL;

-- Completar fechas faltantes en registros existentes
UPDATE users
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

UPDATE users
SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

-- Exigir un estado de cuenta definido
ALTER TABLE users
    ALTER COLUMN is_active SET DEFAULT TRUE,
    ALTER COLUMN is_active SET NOT NULL;

-- Exigir fechas de auditoria
ALTER TABLE users
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL;

    COMMIT;