
# CDAAG-218 - Diseno de datos para autenticacion

## 1. Objetivo

Definir y mejorar la estructura de datos necesaria para
la autenticacipn y autorizacipn de usuarios de GymSystem,
manteniendo la compatibilidad con Supabase Auth y PostgreSQL.

## 2. Arquitectura de autenticacion

El sistema utiliza dos componentes principales:

- Supabase Auth: administra las credenciales, contrasenas
  y tokens de autenticacipn.
- PostgreSQL: almacena los datos personales, roles y
  estados de las cuentas en la tabla `users`.

La relacipn entre ambos se realiza mediante el campo
`supabase_user_id`, que identifica al usuario registrado
en Supabase Auth.

Esta relacipn es lpgica, no una clave foránea SQL,
debido a que los servicios manejan bases separadas.

## 3. Estructura de la tabla users

| Campo | Tipo | Restriccipn |
|---|---|---|
| id | VARCHAR(30) | PRIMARY KEY |
| supabase_user_id | UUID | UNIQUE, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| dni | VARCHAR(20) | UNIQUE, NOT NULL |
| phone | VARCHAR(50) | Opcional |
| date_of_birth | DATE | Opcional |
| role | user_role | NOT NULL, DEFAULT CLIENT |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

## 4. Roles de usuario

Los roles definidos actualmente son:

- CLIENT: cliente del gimnasio.
- RECEPTIONIST: personal de recepción.
- MANAGER: personal de administración.

Cada usuario tiene un rol asignado mediante el campo
`role`, definido como un ENUM de PostgreSQL.

## 5. Relaciones de datos

La tabla `users` tiene una relación de uno a muchos
con la tabla `memberships`, mediante `memberships.user_id`.

Cada membresía pertenece a un plan mediante
`memberships.plan_id`, que referencia `plans.id`.

La autenticación utiliza `supabase_user_id` para
relacionar el perfil local con Supabase Auth.

## 6. Cambios realizados

Se agregaron restricciones NOT NULL a los campos:

- is_active
- created_at
- updated_at

Estas restricciones evitan valores nulos que puedan
generar inconsistencias en el estado de la cuenta
y en las fechas de auditoría.

También se creó la migración:

`001_auth_user_constraints.sql`

Esta permite aplicar las restricciones sobre una
tabla existente sin eliminar registros.

Los usuarios con `is_active = NULL` se convierten
a `FALSE` para evitar habilitarlos accidentalmente.

## 7. Validación realizada

Se realizaron las siguientes comprobaciones:

- Verificación de sintaxis de schema.js.
- Inicialización del esquema en PostgreSQL 16 local.
- Ejecución de la migración mediante psql.
- Verificación de restricciones NOT NULL.
- Confirmación de la existencia de las tablas users,
  plans y memberships.

La migración se ejecutó correctamente sobre una base
recién inicializada y sin registros de usuarios.

Está pendiente comprobar su comportamiento con
registros antiguos que contengan valores NULL.

## 8. Consideraciones de seguridad

- Las contraseñas no se almacenan en la tabla users.
- Supabase Auth administra las credenciales.
- El campo supabase_user_id debe ser único.
- El campo is_active identifica cuentas habilitadas
  o desactivadas.
- La validación de tokens y permisos corresponde al
  backend y no únicamente a las restricciones SQL.
- updated_at requiere ser actualizado por la aplicación
  cuando se modifica un registro; su DEFAULT no lo
  actualiza automáticamente.

## 9. Alcance

Esta subtarea se limita al diseño y mejora de la
estructura de datos para autenticación.

No modifica la implementación de inicio de sesión,
los controladores, los middlewares ni las interfaces
de usuario, correspondientes a otras subtareas.

## 10. Pruebas de migración con datos existentes

Para validar el funcionamiento de la migración se creó una
base de datos independiente llamada `gym_auth_test`.

### Datos de prueba

Se utilizaron dos usuarios ficticios:

- TEST-NULL: usuario con estado y fechas NULL.
- TEST-INACTIVE: usuario inactivo con fechas existentes.

### Resultados obtenidos

1. La migración se ejecutó correctamente.
2. Se conservaron los dos registros existentes.
3. El estado NULL de TEST-NULL se convirtió en FALSE.
4. Las fechas faltantes se completaron automáticamente.
5. TEST-INACTIVE conservó sus valores originales.
6. Las tres columnas quedaron configuradas como NOT NULL.

### Conclusión

La migración permite actualizar las restricciones de
autenticación sin eliminar los registros existentes.

Se comprobó su ejecución sobre una base nueva y sobre
una tabla de prueba con datos incompletos.

La prueba se realizó en PostgreSQL 16 mediante Docker.
No se modificaron los controladores ni los servicios
de autenticación desarrollados por otros integrantes.
