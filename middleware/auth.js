/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Check if user is active
    if (!req.session.user.isActive) {
      req.session.destroy(() => {
        res.redirect('/login?error=account_deactivated');
      });
      return;
    }
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/login');
};

/**
 * Middleware to redirect already logged in users away from login/register
 */
const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    return res.redirect('/member/dashboard');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isGuest
};
