export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    let firstMessage = firstIssue?.message;

    // Si Zod genera un mensaje técnico genérico en inglés (ej: "Invalid input: expected string, received null" o "Expected ...")
    if (
      !firstMessage ||
      firstMessage.toLowerCase().startsWith('invalid input') ||
      firstMessage.toLowerCase().startsWith('expected ')
    ) {
      const fieldName = firstIssue?.path?.join('.') || 'datos';
      firstMessage = `El valor ingresado para '${fieldName}' es inválido o no puede ser nulo`;
    }

    return res.status(400).json({
      error: firstMessage,
      details: result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (source === 'body') {
    req.body = result.data; // cleaned: trimmed, unknown fields stripped
  } else {
    res.locals[source] = result.data; // req.query is read-only in Express 5
  }
  next();
};
