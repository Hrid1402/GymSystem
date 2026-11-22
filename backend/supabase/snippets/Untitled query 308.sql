SELECT u.id, u.email, u.role, tp.specialty
FROM public.users u
LEFT JOIN public.trainer_profiles tp ON tp.user_id = u.id
WHERE u.role = 'TRAINER';