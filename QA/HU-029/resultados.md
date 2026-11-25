# HU-029 · Pruebas de cobro en efectivo en recepción

**Historia.** Inscribir a un cliente en una membresía desde recepción.<br>
**Versión revisada.** `daf044f`.<br>
**Fecha.** 25/11/2026.<br>
**Ejecución.** Codex, en el entorno local del proyecto.<br>
**Suite.** [hu-029-cash-charge.test.js](../../backend/tests/hu-029-cash-charge.test.js).

## Alcance

Supertest ejecuta la ruta y los controles de sesión, permisos y validación. La suite simula las respuestas de Supabase, el almacenamiento de PostgreSQL y la emisión de comprobantes. Cada prueba parte de datos independientes. El archivo `payments.test.js` contiene pruebas de integración con servicios configurados y quedó pendiente de ejecución en un entorno dedicado.

## Resultados

| Caso del Excel | Resultado de la ejecución | Comprobación pendiente |
| --- | --- | --- |
| CP-01 | Pasó para Gerente y Recepcionista. Se envió un pago de S/ 60,00, asociado a la membresía activa de 30 días. | Confirmar en PostgreSQL las fechas del 25/11/2026 al 24/12/2026 y recorrer el formulario desde Clientes. |
| CP-02 | Pasó. Un segundo cobro con membresía activa recibió 409 y dejó un pago y una membresía. | Comprobar el aviso en pantalla. |
| CP-03 | Pasó. Un plan desactivado recibió 404 y no produjo altas. | Comprobar el aviso en pantalla. |
| CP-04 | Pasó. Un cliente desactivado recibió 400 y no produjo altas. | Comprobar el aviso en pantalla. |
| CP-05 | Pasó para cliente omitido y plan omitido. Ambas solicitudes recibieron 400. | Verificar la selección incompleta en el formulario. |
| CP-06 | Cobertura parcial. Se comprobó que el vencimiento se procesa antes de buscar una membresía activa. | Con PostgreSQL aislado, comprobar el cambio de día en Lima y la nueva vigencia del 26/11/2026 al 25/12/2026. |
| CP-07 | Cobertura parcial. El cobro conserva S/ 6,00 y solicita un día de vigencia. | Verificar que el inicio y el fin sean el mismo día y que el plan esté visible en ambos canales. |
| CP-08 | Pasó con almacenamiento simulado. Dos solicitudes llegaron al guardado y obtuvieron 201 y 409. Quedaron un pago y una membresía vinculados. | Confirmar el resultado con la restricción de unicidad real de PostgreSQL. |
| CP-09 | Pasó. La ruta recibió una solicitud sin sesión y respondió 401. | Verificar que la interfaz abra Iniciar sesión. |
| CP-10 | Pasó para Cliente y Entrenador. Ambos recibieron 403 sin crear membresía. | Verificar la restricción desde la interfaz. |
| CP-11 | Pendiente de ejecución en navegador. | Con cada rol autorizado, abrir el cobro desde la fila de Pedro Salas y comprobar que quede seleccionado. |
| CP-12 | Falló. Al simular el error de guardado se obtuvo 500, quedaron cero pagos y una membresía activa en el almacenamiento simulado. | Confirmar la persistencia en PostgreSQL aislado tras reproducir el error. |

## Defecto documentado

**CP-12 · Membresía activa tras un fallo del cobro.** La primera ejecución esperaba cero membresías y encontró una. El controlador registra la membresía antes de guardar el pago. Referencia: `payments.controller.js`, línea 434.

CP-12 usa `it.fails` para que la prueba forme parte de la suite con el defecto conocido. Si la operación se vuelve atómica, Vitest avisará que el fallo esperado dejó de ocurrir. En ese momento se debe cambiar a `it` y mantener la comprobación de cero altas.

## Reproducción

Desde `backend`, con las dependencias del proyecto instaladas:

```powershell
npm.cmd test -- tests/hu-029-cash-charge.test.js
```

- Primera ejecución, con CP-12 como prueba ordinaria: 12 pasaron y CP-12 falló.
- Ejecución final, con el escenario parcial de CP-06 añadido: 13 pasaron y CP-12 quedó registrado como fallo esperado. Vitest 5.0.5.
