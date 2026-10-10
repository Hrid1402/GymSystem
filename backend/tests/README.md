
# CDAAG-219 - Pruebas de autenticación

## Objetivo

Verificar el funcionamiento del inicio de sesión de
GymSystem utilizando Node.js, Express y Supabase Auth.

## Funcionalidad

El endpoint POST /api/auth/login permite autenticar
usuarios mediante correo electrónico y contraseña.

Cuando las credenciales son válidas, el backend
obtiene la información del usuario en PostgreSQL
y devuelve los tokens de autenticación.

## Mejoras implementadas

Se incorporó una validación para comprobar que
Supabase Auth devuelva:

- Identificador del usuario.
- Access Token.
- Refresh Token.

Si la respuesta no contiene estos elementos,
el backend devuelve HTTP 502 en lugar de
intentar utilizar una sesión incompleta.

## Pruebas automatizadas

### auth.login.test.js

1. Rechaza correos con formato inválido (400).
2. Rechaza contraseñas vacías (400).
3. Rechaza credenciales incorrectas (401).
4. Permite iniciar sesión con credenciales válidas (200).

### auth.session.test.js

1. Acepta sesiones completas.
2. Rechaza sesiones inexistentes.
3. Rechaza respuestas sin usuario.
4. Rechaza sesiones sin Access Token.
5. Rechaza sesiones sin Refresh Token.

Las pruebas de auth.session.test.js verifican
la función auxiliar de validación. No simulan
directamente una respuesta HTTP 502.

## Requisitos para ejecutar las pruebas

- Node.js instalado.
- Dependencias del backend instaladas.
- PostgreSQL disponible.
- Supabase Auth local configurado.
- Servidor Express iniciado en localhost:3000.

Las pruebas de login necesitan que los servicios
estén funcionando y que exista un usuario de prueba
registrado en Supabase y PostgreSQL.

## Configuración local

Para ejecutar la prueba de login exitoso,
agregar las siguientes variables al archivo .env:

TEST_LOGIN_EMAIL
TEST_LOGIN_PASSWORD

No subir credenciales ni el archivo .env a GitHub.

Si estas variables no están configuradas,
la prueba de credenciales válidas se omite.

## Ejecución

Desde la carpeta backend:

    node --test ./tests/auth.login.test.js ./tests/auth.session.test.js

## Resultado de las pruebas locales

- Total: 9 pruebas.
- Aprobadas: 9.
- Fallidas: 0.
- Omitidas: 0.

## Alcance

Este trabajo corresponde a CDAAG-219:
Implementar autenticación de usuario.

La gestión de roles, estados de cuenta,
sesiones persistentes, cierre de sesión
y protección de rutas corresponden a
otras subtareas del proyecto.
