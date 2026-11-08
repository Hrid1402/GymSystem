-- Asegurar que cada usuario tenga una única fila de rostro en la tabla asociada
ALTER TABLE client_facials ADD CONSTRAINT unique_face_user_id UNIQUE (user_id);