import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { sequelize } from './models/index.js';
import { initSocket } from './socket/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// ── HTTP Server ───────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://chatly.vedantaa.in',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

// ── Socket.io Server ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  },
});

app.set('io', io);
initSocket(io);

// ── Start Server ──────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Database connected to Supabase PostgreSQL');
    
    // Automatically create/sync tables in database
    await sequelize.sync();
    console.log('Database models synchronized');
  } catch (err) {
    console.warn('  Database connection warning:', err.message);
    console.warn('   Make sure DATABASE_URL is set in backend/.env with your Supabase database password.');
  }

  httpServer.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Socket.io ready`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();

export { io };
