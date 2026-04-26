const { sendError } = require('../utils/httpResponses.utils');

const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  console.error('Error:', {
    method: req.method,
    path: req.originalUrl,
    status,
    code: err.code,
    type: err.type,
    message: err.message,
  });

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Invalid JSON payload');
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return sendError(res, 400, 'Database constraint violation');
  }

  if (err.code === 'SQLITE_ERROR') {
    return sendError(res, 500, 'Database error');
  }

  const message = status >= 500 ? 'Internal server error' : err.message || 'Request failed';
  return sendError(res, status, message);
};

module.exports = { errorHandler };
