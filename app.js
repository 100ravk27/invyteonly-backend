// src/app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
// const sessionStore = require('./config/sessionStore'); // Removed - using in-memory sessions
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();

// Trust proxy (important when behind Nginx)
app.set('trust proxy', 1);

app.use(express.json());

// Serve .well-known files with application/json Content-Type (required for deeplinks)
app.use('/.well-known', (req, res, next) => {
  // Set Content-Type to application/json for deeplink verification files
  if (req.path === '/apple-app-site-association' || req.path === '/assetlinks.json') {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
}, express.static(path.join(__dirname, 'static', '.well-known')));

// Serve app.html at /app (without .html extension) - must be before static middleware
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'app.html'));
});

// Serve static files from the static folder
app.use(express.static(path.join(__dirname, 'static')));

// Determine if we're using HTTPS (check if behind SSL-terminating proxy)
// const isSecure = process.env.FORCE_SECURE_COOKIE === 'true' || 
//                  (process.env.NODE_ENV === 'production' && process.env.USE_HTTPS !== 'false');
const isSecure = false;
const sessionConfig = {
  key: 'invyte.sid',
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  // store: sessionStore, // Removed - using default in-memory store
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: isSecure, // Only true if explicitly set or in production with HTTPS
    sameSite: isSecure ? 'strict' : 'lax' // 'lax' works better for HTTP, 'strict' for HTTPS
  }
};

console.log('🔧 [Session Config]', {
  key: sessionConfig.key,
  secure: sessionConfig.cookie.secure,
  httpOnly: sessionConfig.cookie.httpOnly,
  sameSite: sessionConfig.cookie.sameSite,
  NODE_ENV: process.env.NODE_ENV,
  trustProxy: app.get('trust proxy'),
  FORCE_SECURE_COOKIE: process.env.FORCE_SECURE_COOKIE,
  USE_HTTPS: process.env.USE_HTTPS
});

app.use(session(sessionConfig));

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/wishlist', wishlistRoutes);

app.get('/', (_, res) => res.send('InvyteOnly backend is running 🚀'));

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'InvyteOnly Backend'
  });
});

module.exports = app;
