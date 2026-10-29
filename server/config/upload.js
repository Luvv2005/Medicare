import multer from 'multer';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const sniff = (b) => {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (b.subarray(0, 4).toString() === '%PDF') return 'application/pdf';
  return null;
};

const uploader = multer({
  storage: multer.memoryStorage(), // disk par nahi, memory se seedha database mein
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG, WEBP or PDF files are allowed')),
});

export const uploadOne = (field) => (req, res, next) =>
  uploader.single(field)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller' : err.message;
    return res.status(400).json({ message });
  });

// File ke asli bytes check karta hai. Galat ho to null.
export async function verifyUpload(file, { imageOnly = false } = {}) {
  const real = sniff(file.buffer);
  if (!real || real !== file.mimetype || (imageOnly && real === 'application/pdf')) return null;
  return real;
}

// Memory storage mein delete karne ko kuch nahi (purane controllers ise bulate hain)
export const removeUpload = async () => {};