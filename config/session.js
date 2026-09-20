const session = require('express-session');
const MongoStore = require('connect-mongo');

const configureSession = () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gymflow';

  return session({
    secret: process.env.SESSION_SECRET || 'gymflow_default_secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoURI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    }
  });
};

module.exports = configureSession;
