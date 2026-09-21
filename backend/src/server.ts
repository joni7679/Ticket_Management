import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { setSocketServer } from './config/socket.js';
import { verifyAccessToken } from './utils/jwt.js';
import { app } from './app.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: env.ALLOW_ALL_ORIGINS
    ? { origin: true, credentials: true }
    : { origin: env.FRONTEND_URL, credentials: true }
});

setSocketServer(io);

io.use((socket, next) => {
  const token = (socket.handshake.auth?.token as string | undefined)
    ?? (socket.handshake.query?.token as string | undefined);
  if (!token) {
    // Allow anonymous connection; user room join happens after auth event
    return next();
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    socket.join(`user:${payload.userId}`);
    return next();
  } catch {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('authenticate', (token: string) => {
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.join(`user:${payload.userId}`);
    } catch {
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });

  socket.on('disconnect', () => {
    // rooms are cleaned up automatically by socket.io
  });
});

function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  io.close(() => {
    server.close(() => {
      void mongoose.connection.close().then(() => {
        console.log('HTTP server and MongoDB connection closed.');
        process.exit(0);
      }).catch((error) => {
        console.error('Error during shutdown:', error);
        process.exit(1);
      });
    });
  });
  // Force exit if graceful shutdown hangs
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function bootstrap() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
    return;
  }
  server.listen(env.PORT, env.HOST, () => {
    console.log(`API listening on ${env.HOST}:${env.PORT}`);
  });
}

void bootstrap();

export { io, server };
