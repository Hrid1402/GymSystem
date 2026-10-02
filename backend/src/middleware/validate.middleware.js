export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
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