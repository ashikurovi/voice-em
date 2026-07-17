const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Server Error'
  });
};

module.exports = { errorHandler };
