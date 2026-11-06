import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';

// Doctor apne hi profile par booking/waitlist nahi kar sakta
export const notSelf = async (req, res, next) => {
  try {
    const id = req.body?.doctorId;
    if (mongoose.isValidObjectId(id)) {
      const d = await Doctor.findById(id).select('user');
      if (d && String(d.user) === String(req.user._id))
        return res.status(400).json({ message: 'You cannot book an appointment with yourself' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
};