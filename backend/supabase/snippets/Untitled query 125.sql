SELECT
  id,
  user_id,
  created_at,
  (created_at AT TIME ZONE 'America/Lima') AS created_lima,
  exited_at,
  entry_method
FROM attendances
WHERE exited_at IS NULL
  AND (created_at AT TIME ZONE 'America/Lima')::date = (now() AT TIME ZONE 'America/Lima')::date
ORDER BY created_at DESC;