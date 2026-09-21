import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export function getSocketServer() {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}
