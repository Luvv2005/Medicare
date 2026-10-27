import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Login token ke bina connection nahi
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('isActive');
      if (!user || !user.isActive) return next(new Error('unauthorized'));
      socket.data.userId = String(user._id);
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`); // har user sirf apne room mein
  });

  return io;
};

// Sirf "kuch badla" ka signal. Asli data client authorized API se laata hai.
export const emitToUser = (userId, event, payload = {}) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};