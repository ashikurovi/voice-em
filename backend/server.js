require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { activeSockets, setIo } = require('./src/utils/socketStore');
const User = require('./src/models/User');

// Import Routes & Middlewares
const emergencyRoutes = require('./src/routes/emergencyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const authRoutes = require('./src/routes/authRoutes');
const { errorHandler } = require('./src/middlewares/errorMiddleware');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

setIo(io); // Save io instance to store

// Global Middlewares
app.use(express.json());
app.use(cors());

// Mount Routes
app.use('/api/emergency', emergencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);

// Global Error Handler (must be after routes)
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);

  socket.on('update_location', async (data) => {
    if (data && data.userId && data.lat && data.lng) {
      activeSockets.set(data.userId.toString(), {
        socketId: socket.id,
        lat: data.lat,
        lng: data.lng
      });
      console.log(`[SOCKET] Location updated for user ${data.userId}`);

      try {
        await User.findByIdAndUpdate(data.userId, {
          lastLocation: { lat: data.lat, lng: data.lng, updatedAt: new Date() }
        });
      } catch (err) {
        console.error('[DB] Failed to save location:', err.message);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`);
    for (const [userId, socketData] of activeSockets.entries()) {
      if (socketData.socketId === socket.id) {
        activeSockets.delete(userId);
        break;
      }
    }
  });
});

// Database Connection & Server Start
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

module.exports = app;
