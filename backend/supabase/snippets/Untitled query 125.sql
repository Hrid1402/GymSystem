ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_method TEXT,
  ADD COLUMN IF NOT EXISTS exit_registered_by TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_attendances_user_day_exit
  ON attendances (user_id, created_at DESC)
  WHERE exited_at IS NULL;