const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Simple admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'defiant2024'; // Change this to something secure
const scheduleRoutes = require('./routes/scheduleRoutes');
// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use('/api/schedule', scheduleRoutes);
// Simple session tracking (in memory - for development only)
const activeSessions = new Set();

// Simple login route
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Generate simple session token
    const sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    activeSessions.add(sessionToken);
    
    res.json({ 
      success: true, 
      message: 'Logged in successfully!',
      token: sessionToken
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }
});

// Simple logout route
app.post('/admin/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Simple authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && activeSessions.has(token)) {
    next(); // User is authenticated
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Please login.' 
    });
  }
};

// Check if user is authenticated
app.get('/admin/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && activeSessions.has(token)) {
    res.json({ 
      success: true, 
      authenticated: true,
      user: { username: ADMIN_USERNAME, role: 'admin' }
    });
  } else {
    res.json({ 
      success: false, 
      authenticated: false 
    });
  }
});

// TEMPORARILY COMMENTED OUT - these routes have issues we'll fix later
// Public Routes (no authentication needed)
 // Test route
// Simple working menu route (no database needed for now)
// Simple working menu route (return just the array)
// Handle preflight requests explicitly

app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));

// Protected Admin Routes (authentication required)
// app.use('/api/admin/menu', requireAuth, require('./routes/menuRoutes'));
// app.use('/api/admin/orders', requireAuth, require('./routes/orderRoutes'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'defiantmeals'
})
.then(() => console.log('MongoDB connected successfully to defiantmeals'))
.catch((err) => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Defiant Meals Backend API',
    endpoints: {
      login: 'POST /admin/login',
      logout: 'POST /admin/logout',
      check: 'GET /admin/check',
      health: 'GET /api/health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Admin login: POST http://localhost:${PORT}/admin/login`);
  console.log(`Username: ${ADMIN_USERNAME}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
});

module.exports = app;