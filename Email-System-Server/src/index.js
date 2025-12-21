require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const emailRoutes = require('./routes/emails');
const aiRoutes = require('./routes/ai');
const authMiddleware = require('./middleware/auth');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with improved stability configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Connection stability settings
  pingTimeout: 60000,        // How long to wait for pong before considering connection dead
  pingInterval: 25000,       // How often to ping clients
  connectTimeout: 45000,     // Connection timeout
  transports: ['websocket', 'polling'], // Allow fallback to polling
  allowUpgrades: true,       // Allow transport upgrade
  // Performance settings
  maxHttpBufferSize: 1e6,    // 1MB max message size
  perMessageDeflate: {
    threshold: 1024,         // Only compress messages larger than 1KB
  },
});

// Store io instance for use in routes
app.set('io', io);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    socketConnections: io.engine.clientsCount || 0
  });
});

// API routes
app.use('/api/emails', authMiddleware, emailRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Track connected users
const connectedUsers = new Map();

// Socket.IO connection handling with improved error handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Track connection time
  socket.connectionTime = Date.now();

  // Handle authentication
  const token = socket.handshake.auth?.token;
  if (token) {
    socket.authenticated = true;
  }

  // Join user's room for private messages
  socket.on('join-room', (userId) => {
    if (!userId) {
      console.log('Invalid userId for join-room');
      return;
    }

    // Leave previous room if any
    const previousRoom = connectedUsers.get(socket.id);
    if (previousRoom) {
      socket.leave(`user:${previousRoom}`);
    }

    // Join new room
    socket.join(`user:${userId}`);
    connectedUsers.set(socket.id, userId);
    console.log(`User ${userId} joined their room`);

    // Send acknowledgment
    socket.emit('room-joined', { userId, success: true });
  });

  // Handle client ping (manual keep-alive)
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', socket.id, error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    
    // Cleanup user tracking
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
    }

    // Log connection duration
    const duration = Date.now() - socket.connectionTime;
    console.log(`Connection duration: ${Math.round(duration / 1000)}s`);
  });

  // Handle reconnection
  socket.on('reconnect', () => {
    console.log('Client reconnected:', socket.id);
  });
});

// Periodic cleanup of stale connections (every 5 minutes)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  io.sockets.sockets.forEach((socket) => {
    if (socket.connectionTime && (now - socket.connectionTime) > timeout) {
      // Check if socket is still active
      if (!socket.connected) {
        console.log('Cleaning up stale socket:', socket.id);
        socket.disconnect(true);
      }
    }
  });
}, 5 * 60 * 1000);

// Graceful shutdown handler
function gracefulShutdown() {
  console.log('Shutting down server gracefully...');
  clearInterval(cleanupInterval);
  
  io.close(() => {
    console.log('Socket.IO closed');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 VeryGoodMail Server is running!                  ║
║                                                        ║
║   Port: ${PORT}                                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║                                                        ║
║   © 2025 VeryGoodMail by Hoàn                         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, io };
