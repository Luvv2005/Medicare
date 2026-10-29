import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import asyncHandler from '../utils/asyncHandler.js';

// Patient ki koi completed appointment jis par review nahi diya
const findReviewable = async (patient, doctor) => {
  const done = await Appointment.find({ patient, doctor, status: 'completed' }).select('_id');
  if (!done.length) return null;
  const reviewed = new Set(
    (await Review.find({ appointment: { $in: done.map((d) => d._id) } }).select('appointment')).map((r) => String(r.appointment))
  );
  return done.find((d) => !reviewed.has(String(d._id))) || null;
};

// GET /api/reviews/doctor/:id   (public)
export const forDoctor = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Doctor not found' });
  const list = await Review.find({ doctor: req.params.id }).sort({ createdAt: -1 }).limit(20).populate('patient', 'name');
  res.json({
    reviews: list.map((r) => ({
      _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
      name: (r.patient?.name || 'Patient').split(' ')[0],
    })),
  });
});

// GET /api/reviews/eligible/:doctorId   (patient)
export const eligible = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.json({ eligible: false });
  res.json({ eligible: Boolean(await findReviewable(req.user._id, req.params.doctorId)) });
});

// POST /api/reviews   body: { doctorId, rating, comment }
export const createReview = asyncHandler(async (req, res) => {
  const { doctorId } = req.body;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim().slice(0, 500);
  if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: 'Invalid doctor' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1 to 5' });

  const appt = await findReviewable(req.user._id, doctorId);
  if (!appt) return res.status(403).json({ message: 'You can review a doctor after a completed appointment' });

  try {
    await Review.create({ doctor: doctorId, patient: req.user._id, appointment: appt._id, rating, comment });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already reviewed this appointment' });
    throw err;
  }

  const [agg] = await Review.aggregate([
    { $match: { doctor: new mongoose.Types.ObjectId(doctorId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  // Asli review aate hi demo rating hat jati hai
  await Doctor.updateOne(
    { _id: doctorId },
    { rating: { value: Math.round(agg.avg * 10) / 10, count: agg.count, isDemo: false } }
  );
  res.status(201).json({ message: 'Thanks for your review!' });
});