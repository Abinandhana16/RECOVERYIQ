const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./src/routes/auth');
const casesRouter = require('./src/routes/cases');
const actionsRouter = require('./src/routes/actions');
const mlRouter = require('./src/routes/ml');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recoveryiq';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/ml', mlRouter);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Database Connection and Server Startup
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    app.listen(PORT, () => {
      console.log(`RecoveryIQ Server running on port ${PORT}`);
      console.log('🔒 JWT Authentication active: /api/cases routes require a valid Bearer token.');
      console.log('🔑 Use POST /api/auth/register or POST /api/auth/login to obtain an access token.');
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    // Still allow server to start for development/testing if DB is pending
    app.listen(PORT, () => {
      console.log(`RecoveryIQ Server running on port ${PORT} (Database connection pending)`);
      console.log('🔒 JWT Authentication active: /api/cases routes require a valid Bearer token.');
    });
  });

module.exports = app;
