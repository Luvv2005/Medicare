import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import asyncHandler from '../utils/asyncHandler.js';
import { notify } from '../utils/notify.js';
import { emitToUser } from '../socket.js';
import { createFileDoc } from '../utils/fileStore.js';
import { removeUpload } from '../config/upload.js';

const isMember = (c, id) => [String(c.patient), String(c.doctorUser)].includes(String(id));
const getConv = async (id, user) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const c = await Conversation.findById(id);
  return c && isMember(c, user._id) ? c : null;
};

// GET /api/chat/conversations
export const listConversations = asyncHandler(async (req, res) => {
  const isPatient = req.user.role === 'patient';
  const list = await Conversation.find(isPatient ? { patient: req.user._id } : { doctorUser: req.user._id })
    .populate('patient', 'name')
    .populate('doctor', 'name specialization')
    .sort({ lastAt: -1 });
  res.json({
    conversations: list.map((c) => ({
      _id: c._id,
      otherName: isPatient ? c.doctor?.name : c.patient?.name,
      subtitle: isPatient ? c.doctor?.specialization : 'Patient',
      lastMessage: c.lastMessage,
      lastAt: c.lastAt,
      unread: isPatient ? c.unread.patient : c.unread.doctor,
    })),
  });
});

// POST /api/chat/start   body: { doctorId }   (patient)
export const startConversation = asyncHandler(async (req, res) => {
  const { doctorId } = req.body;
  if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: 'Invalid doctor' });
  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved' });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const ok = await Appointment.exists({
    patient: req.user._id, doctor: doctor._id, status: { $in: ['confirmed', 'completed'] },
  });
  if (!ok)
    return res.status(403).json({ message: 'You can chat with a doctor after booking a confirmed appointment with them' });

  const conversation = await Conversation.findOneAndUpdate(
    { patient: req.user._id, doctor: doctor._id },
    { $setOnInsert: { doctorUser: doctor.user, lastAt: new Date() } },
    { upsert: true, new: true }
  );
  res.json({ conversation });
});

// GET /api/chat/:id/messages
export const getMessages = asyncHandler(async (req, res) => {
  const c = await getConv(req.params.id, req.user);
  if (!c) return res.status(404).json({ message: 'Conversation not found' });
  const side = String(c.patient) === String(req.user._id) ? 'patient' : 'doctor';
  await Conversation.updateOne({ _id: c._id }, { [`unread.${side}`]: 0 });
  const messages = (await Message.find({ conversation: c._id }).sort({ createdAt: -1 }).limit(100)).reverse();
  res.json({ messages });
});

// POST /api/chat/:id/messages   (form: text, file)
export const sendMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 1000);
  const c = await getConv(req.params.id, req.user);
  if (!c) {
    if (req.file) await removeUpload(req.file);
    return res.status(404).json({ message: 'Conversation not found' });
  }
  if (!text && !req.file) return res.status(400).json({ message: 'Type a message or choose a file' });

  let f = null;
  if (req.file) {
    f = await createFileDoc(req.file, req.user._id, 'chat', { ref: c._id });
    if (!f) return res.status(400).json({ message: 'That is not a valid JPG, PNG, WEBP or PDF file' });
  }

  const message = await Message.create({
    conversation: c._id, sender: req.user._id, kind: f ? 'file' : 'text', text,
    fileId: f?._id, fileName: f?.name, fileMime: f?.mime, fileSize: f?.size,
  });

  const mePatient = String(c.patient) === String(req.user._id);
  const other = mePatient ? c.doctorUser : c.patient;
  const otherSide = mePatient ? 'doctor' : 'patient';
  const before = c.unread[otherSide];

  await Conversation.updateOne(
    { _id: c._id },
    { lastMessage: text || `📎 ${f.name}`, lastAt: new Date(), $inc: { [`unread.${otherSide}`]: 1 } }
  );
  if (before === 0)
    await notify(other, { type: 'chat', title: 'New message', message: `${req.user.name} sent you a message.`, link: '/chat' });

  emitToUser(other, 'chat:message', { conversationId: String(c._id) });
  emitToUser(req.user._id, 'chat:message', { conversationId: String(c._id) });
  res.status(201).json({ message });
});