const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ error: 'Database constraint violation' });
  }

  if (err.code === 'SQLITE_ERROR') {
    return res.status(500).json({ error: 'Database error' });
  }

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message || 'Request failed';

  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
