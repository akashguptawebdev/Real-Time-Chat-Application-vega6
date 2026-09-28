import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { sequelize } from './models/index.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

// ── HTTP Server ───────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ── Socket.io Server ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// ── Start Server ──────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Database connected');
  } catch (err) {
    console.warn('  Database not connected:', err.message);
    console.warn('  Server start — DB-dependent routes may fail.');
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();

export { io };
