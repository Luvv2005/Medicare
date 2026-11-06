import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { SPECIALIZATIONS } from '../utils/constants.js';
import { notify } from '../utils/notify.js';

export const MAX_RESUBMITS = 3;

const toList = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
};

// POST /api/doctors/me/resubmit   (sirf rejected doctor)
export const resubmit = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  if (doctor.status !== 'rejected')
    return res.status(400).json({ message: 'Only a rejected application can be resubmitted' });
  if (doctor.rejectionReason === 'Account disabled by admin' || doctor.rejectionReason === 'Account deleted by the doctor')
    return res.status(403).json({ message: 'This application cannot be resubmitted. Please contact support.' });
  if (doctor.resubmitCount >= MAX_RESUBMITS)
    return res.status(403).json({ message: 'You have used all resubmissions. Please contact support.' });

  const { specialization, experienceYears } = req.body;
  const qualifications = toList(req.body.qualifications);
  const registrationNumber = String(req.body.registrationNumber || '').trim();
  const registrationCouncil = String(req.body.registrationCouncil || '').trim();
  const exp = Number(experienceYears);

  if (!SPECIALIZATIONS.includes(specialization))
    return res.status(400).json({ message: 'Please choose a valid specialization' });
  if (qualifications.length === 0)
    return res.status(400).json({ message: 'At least one qualification is required' });
  if (!Number.isFinite(exp) || exp < 0 || exp > 70)
    return res.status(400).json({ message: 'Experience must be between 0 and 70 years' });
  if (!registrationNumber || !registrationCouncil)
    return res.status(400).json({ message: 'Registration number and council are required' });

  const clash = await Doctor.findOne({
    registrationNumber, registrationCouncil, _id: { $ne: doctor._id },
  });
  if (clash) return res.status(409).json({ message: 'This registration number is already submitted' });

  doctor.specialization = specialization;
  doctor.qualifications = qualifications;
  doctor.experienceYears = exp;
  doctor.registrationNumber = registrationNumber;
  doctor.registrationCouncil = registrationCouncil;
  doctor.status = 'pending';
  doctor.resubmitCount += 1;
  await doctor.save();

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      notify(a._id, {
        type: 'doctor',
        title: 'Doctor resubmitted application',
        message: `${doctor.name} resubmitted their application for review.`,
        link: '/admin',
      })
    )
  );

  res.json({ message: 'Application resubmitted. An admin will review it again.', doctor });
});