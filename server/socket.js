import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

let io = null;
const calls = new Map(); // conversationId -> { caller, callee, type, answered, startedAt, timer }
const inCall = new Map(); // userId -> conversationId

// Call khatam: dono ko batao aur chat mein history likho
async function endCall(cid, status) {
  const e = calls.get(cid);
  if (!e) return;
  clearTimeout(e.timer);
  calls.delete(cid);
  inCall.delete(e.caller);
  inCall.delete(e.callee);

  const final = e.answered ? 'completed' : status;
  const duration = e.answered ? Math.round((Date.now() - e.startedAt) / 1000) : 0;
  [e.caller, e.callee].forEach((u) => io.to(`user:${u}`).emit('call:ended', { conversationId: cid, status: final }));

  try {
    await Message.create({
      conversation: cid, sender: e.caller, kind: 'call',
      callType: e.type, callStatus: final, callDuration: duration,
    });
    await Conversation.updateOne({ _id: cid }, { lastMessage: `${e.type} call (${final})`, lastAt: new Date() });
    [e.caller, e.callee].forEach((u) => io.to(`user:${u}`).emit('chat:message', { conversationId: cid }));
  } catch (err) {
    console.error('Call log failed:', err.message);
  }
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL, credentials: true } });

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
    const me = socket.data.userId;
    socket.join(`user:${me}`);

    const memberConv = async (id) => {
      try {
        const c = await Conversation.findById(id);
        return c && [String(c.patient), String(c.doctorUser)].includes(me) ? c : null;
      } catch {
        return null;
      }
    };

    socket.on('call:invite', async ({ conversationId, type } = {}) => {
      const cid = String(conversationId);
      if (!['audio', 'video'].includes(type)) return;
      const c = await memberConv(cid);
      if (!c) return;
      const callee = String(c.patient) === me ? String(c.doctorUser) : String(c.patient);

      if (inCall.has(me) || inCall.has(callee)) return socket.emit('call:busy', { conversationId: cid });

      const entry = { caller: me, callee, type, answered: false, startedAt: 0, timer: null };
      calls.set(cid, entry);
      inCall.set(me, cid);
      inCall.set(callee, cid);

      const online = (await io.in(`user:${callee}`).fetchSockets()).length > 0;
      if (!online) return endCall(cid, 'unavailable');

      entry.timer = setTimeout(() => endCall(cid, 'missed'), 40000);
      const caller = await User.findById(me).select('name');
      return io.to(`user:${callee}`).emit('call:incoming', { conversationId: cid, type, from: { id: me, name: caller?.name } });
    });

    socket.on('call:accept', ({ conversationId } = {}) => {
      const cid = String(conversationId);
      const e = calls.get(cid);
      if (!e || e.callee !== me || e.answered) return;
      e.answered = true;
      e.startedAt = Date.now();
      clearTimeout(e.timer);
      io.to(`user:${e.caller}`).emit('call:accepted', { conversationId: cid });
    });

    socket.on('call:decline', ({ conversationId } = {}) => {
      const cid = String(conversationId);
      const e = calls.get(cid);
      if (e && e.callee === me && !e.answered) endCall(cid, 'declined');
    });

    socket.on('call:end', ({ conversationId } = {}) => {
      const cid = String(conversationId);
      const e = calls.get(cid);
      if (e && (e.caller === me || e.callee === me)) endCall(cid, 'missed');
    });

    socket.on('call:signal', ({ conversationId, data } = {}) => {
      const cid = String(conversationId);
      const e = calls.get(cid);
      if (!e || (e.caller !== me && e.callee !== me) || !data) return;
      const other = e.caller === me ? e.callee : e.caller;
      io.to(`user:${other}`).emit('call:signal', { conversationId: cid, data });
    });

    socket.on('disconnect', async () => {
      const cid = inCall.get(me);
      if (!cid) return;
      const left = await io.in(`user:${me}`).fetchSockets();
      if (left.length === 0) endCall(cid, 'missed');
    });
  });

  return io;
};

// Sirf "kuch badla" ka signal. Asli data client authorized API se laata hai.
export const emitToUser = (userId, event, payload = {}) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};