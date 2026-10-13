export const notFound = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  // Malformed JSON body (trailing comma, missing quote, etc.)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El formato del cuerpo de la solicitud no es un JSON válido' });
  }

  // Body bigger than the express.json() limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El tamaño de la solicitud excede el límite permitido' });
  }

  // Anything else is unexpected: log the details, hide them from the client
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor. Inténtalo de nuevo más tarde.' });
};