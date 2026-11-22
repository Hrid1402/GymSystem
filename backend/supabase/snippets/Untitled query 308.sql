CREATE TABLE IF NOT EXISTS class_enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inscrito_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_class_client_enrollment UNIQUE (class_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_client
  ON class_enrollments (client_id, class_id);