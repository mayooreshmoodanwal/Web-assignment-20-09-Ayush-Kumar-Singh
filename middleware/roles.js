/**
 * Authorize users based on one or more roles
 * Usage: authorizeRoles('admin') or authorizeRoles('admin', 'trainer')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to access this page');
      return res.redirect('/login');
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied - GymFlow',
        user: req.session.user,
        message: 'You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles
};
