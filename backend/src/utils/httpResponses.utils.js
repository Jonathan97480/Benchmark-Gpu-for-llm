function sendError(res, status, error, extra = {}) {
  return res.status(status).json({
    error,
    status,
    ...extra,
  });
}

module.exports = {
  sendError,
};
