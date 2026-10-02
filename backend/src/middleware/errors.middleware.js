export const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  // Malformed JSON body (trailing comma, missing quote, etc.)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  // Body bigger than the express.json() limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  // Anything else is unexpected: log the details, hide them from the client
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};