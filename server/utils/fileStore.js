import File from '../models/File.js';
import { verifyUpload } from '../config/upload.js';

export async function createFileDoc(file, owner, kind, { ref, isPublic = false, imageOnly = false } = {}) {
  const real = await verifyUpload(file, { imageOnly });
  if (!real) return null;
  return File.create({
    owner, kind, name: String(file.originalname).slice(0, 120),
    mime: real, size: file.size, data: file.buffer, ref, isPublic,
  });
}

export const publicUrl = (req, id) =>
  `${process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`}/api/files/public/${id}`;