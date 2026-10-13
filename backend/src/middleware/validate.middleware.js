export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const firstMessage = result.error.issues[0]?.message;
    return res.status(400).json({
      error: firstMessage && firstMessage !== 'Invalid input' ? firstMessage : 'Error de validación en los datos enviados',
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