/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).render('errors/404', {
    title: 'Page Not Found - GymFlow',
    user: req.session ? req.session.user : null,
    url: req.originalUrl
  });
};

/**
 * Centralized Error Handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Application Error]', err.stack || err);

  const statusCode = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(statusCode).render('errors/500', {
    title: 'Internal Server Error - GymFlow',
    user: req.session ? req.session.user : null,
    message: isDev ? err.message : 'An unexpected error occurred. Please try again later.',
    stack: isDev ? err.stack : null
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
