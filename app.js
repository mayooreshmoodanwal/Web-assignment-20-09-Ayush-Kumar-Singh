require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const connectDB = require('./config/db');
const configureSession = require('./config/session');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const memberRoutes = require('./routes/memberRoutes');

const app = express();

// Trust proxy for secure cookies behind reverse proxies (Vercel, Render, etc.)
app.set('trust proxy', 1);

// Middleware to ensure DB connection before handling requests in serverless environments
app.use(async (req, res, next) => {
  // Skip DB connection for static assets
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images') || req.path === '/favicon.ico') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Connection Middleware Error]', err.message);
    next(err);
  }
});

// Security middleware (Helmet configured for Chart.js & Google Fonts CDN)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  })
);

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE via POST forms
app.use(methodOverride('_method'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(configureSession());

// Flash messages
app.use(flash());

// Global locals for EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.currentPath = req.path;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/trainer', trainerRoutes);
app.use('/member', memberRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[GymFlow] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
