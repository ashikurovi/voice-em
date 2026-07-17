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

// We will initialize io dynamically for Vercel
// io is attached to res.socket.server inside middleware

// Global Middlewares
app.use(express.json());
app.use(cors());

// Database Connection for Serverless (Vercel)
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] Failed to connect to MongoDB', err);
  }
};

// Ensure DB is connected and Socket.io is initialized on Vercel
app.use(async (req, res, next) => {
  await connectDB();

  // Vercel Socket.io Hack
  if (!res.socket || !res.socket.server) {
    return next(); // Local environment fallback
  }

  if (!res.socket.server.io) {
    console.log('[SOCKET] Initializing Socket.io on Vercel');
    const io = new Server(res.socket.server, {
      path: '/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

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

    res.socket.server.io = io;
    setIo(io); // Save io instance to store
  }

  req.io = res.socket.server.io;
  next();
});

// Root Route for Vercel Health Check
app.get('/', (req, res) => {
  res.status(200).json({ message: "Guardian Protocol API is running 🚀" });
});

// Mount Routes
app.use('/api/emergency', emergencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);

// Global Error Handler (must be after routes)
app.use(errorHandler);

// Database Connection & Server Start (for local testing)
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    // Local Socket.io Init
    const localIo = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    setIo(localIo);
    
    localIo.on('connection', (socket) => {
      console.log(`[SOCKET] Local User connected: ${socket.id}`);
      socket.on('update_location', async (data) => {
        if (data && data.userId && data.lat && data.lng) {
          activeSockets.set(data.userId.toString(), {
            socketId: socket.id, lat: data.lat, lng: data.lng
          });
          await User.findByIdAndUpdate(data.userId, {
            lastLocation: { lat: data.lat, lng: data.lng, updatedAt: new Date() }
          }).catch(err => console.error(err));
        }
      });
      socket.on('disconnect', () => {
        for (const [userId, socketData] of activeSockets.entries()) {
          if (socketData.socketId === socket.id) {
            activeSockets.delete(userId);
            break;
          }
        }
      });
    });

    app.use((req, res, next) => {
      req.io = localIo;
      next();
    });

    server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
  });
}

module.exports = app;
