// src/app.js
const express = require('express');
const session = require('express-session');
// const sessionStore = require('./config/sessionStore'); // Removed - using in-memory sessions
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();
app.use(express.json());

app.use(session({
  key: 'invyte.sid',
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  // store: sessionStore, // Removed - using default in-memory store
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/wishlist', wishlistRoutes);

app.get('/', (_, res) => res.send('InvyteOnly backend is running 🚀'));

module.exports = app;
