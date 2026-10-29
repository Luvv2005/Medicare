import mongoose from 'mongoose';
import File from '../models/File.js';
import Doctor from '../models/Doctor.js';
import Product from '../models/Product.js';
import Conversation from '../models/Conversation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createFileDoc, publicUrl } from '../utils/fileStore.js';
import { logAudit } from '../utils/audit.js';

const send = (res, f, pub) => {
  if (!f.data) return res.status(404).json({ message: 'File not found' });
  res.set({
    'Content-Type': f.mime,
    'Content-Disposition': 'inline',
    'Cache-Control': pub ? 'public, max-age=3600' : 'private, no-store',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.send(f.data);
};

// GET /api/files/public/:id   (doctor photo, product image)
export const servePublic = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'File not found' });
  const f = await File.findOne({ _id: req.params.id, isPublic: true }).select('+data');
  if (!f) return res.status(404).json({ message: 'File not found' });
  return send(res, f, true);
});

// GET /api/files/:id   (private: owner, admin ya chat ke dono log)
export const serveProtected = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'File not found' });
  const f = await File.findById(req.params.id).select('+data');
  if (!f) return res.status(404).json({ message: 'File not found' });

  const me = String(req.user._id);
  let ok = req.user.role === 'admin' || String(f.owner) === me || f.isPublic;
  if (!ok && f.kind === 'chat') {
    const c = await Conversation.findById(f.ref);
    ok = Boolean(c) && [String(c.patient), String(c.doctorUser)].includes(me);
  }
  if (!ok) return res.status(403).json({ message: 'You do not have access to this file' });
  return send(res, f, false);
});

// POST /api/files/doctor-photo
export const uploadDoctorPhoto = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose an image' });
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const f = await createFileDoc(req.file, req.user._id, 'doctor-photo', { ref: doctor._id, isPublic: true, imageOnly: true });
  if (!f) return res.status(400).json({ message: 'That is not a valid JPG, PNG or WEBP image' });
  const url = publicUrl(req, f._id);
  await Doctor.updateOne({ _id: doctor._id }, { profilePhoto: url });
  res.json({ profilePhoto: url });
});

// POST /api/files/doctor-doc   (form: file, label)
export const uploadDoctorDoc = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a file' });
  const label = String(req.body.label || '').trim().slice(0, 60);
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  if (label.length < 2) return res.status(400).json({ message: 'Enter a label for the document' });
  if ((doctor.documents || []).length >= 6) return res.status(400).json({ message: 'You can upload at most 6 documents' });

  const f = await createFileDoc(req.file, req.user._id, 'doctor-doc', { ref: doctor._id });
  if (!f) return res.status(400).json({ message: 'That is not a valid JPG, PNG, WEBP or PDF file' });
  await Doctor.updateOne({ _id: doctor._id }, { $push: { documents: { label, url: `/api/files/${f._id}` } } });
  res.status(201).json({ message: 'Document uploaded. The admin will review it.' });
});

// PUT /api/files/doctor-location   body: { lat, lng }
export const setDoctorLocation = asyncHandler(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) || req.body.lat === '' || req.body.lng === '')
    return res.status(400).json({ message: 'Invalid location' });
  const r = await Doctor.updateOne({ user: req.user._id }, { 'clinic.location': { type: 'Point', coordinates: [lng, lat] } });
  if (!r.matchedCount) return res.status(404).json({ message: 'Doctor profile not found' });
  res.json({ message: 'Clinic location saved' });
});

// POST /api/files/product/:id   (admin)
export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose an image' });
  const product = mongoose.isValidObjectId(req.params.id) ? await Product.findById(req.params.id) : null;
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const f = await createFileDoc(req.file, req.user._id, 'product', { ref: product._id, isPublic: true, imageOnly: true });
  if (!f) return res.status(400).json({ message: 'That is not a valid JPG, PNG or WEBP image' });
  product.image = publicUrl(req, f._id);
  await product.save();
  await logAudit(req, 'PRODUCT_IMAGE_SET', 'Product', product._id, {});
  res.json({ image: product.image });
});