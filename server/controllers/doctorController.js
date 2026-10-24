
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import { SPECIALIZATIONS } from '../utils/constants.js';
import parseQuery from '../utils/parseQuery.js';
import { levenshtein, allowedDistance } from '../utils/fuzzy.js';



const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

// Public response mein ye private fields nahi jayengi
const PUBLIC_EXCLUDE = '-user -reviewedBy -rejectionReason -documents -__v';

const toList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
};

// GET /api/doctors/specializations
export const getSpecializations = (req, res) => {
  res.json({ specializations: SPECIALIZATIONS });
};

// POST /api/doctors/register
export const registerDoctor = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password,
    specialization, experienceYears,
    registrationNumber, registrationCouncil,
    clinic = {}, consultationFee, modes = {}, payAtClinic, bio,
  } = req.body;

  const qualifications = toList(req.body.qualifications);
  const languages = toList(req.body.languages);

  // ---- Validation ----
  if (!name || name.trim().length < 2) return res.status(400).json({ message: 'Name is required' });
  if (!email || !emailRegex.test(email)) return res.status(400).json({ message: 'Valid email is required' });
  if (!phone || !phoneRegex.test(phone)) return res.status(400).json({ message: 'Valid 10-digit phone is required' });
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return res.status(400).json({ message: 'Password must be 8+ characters with at least one letter and one number' });
  if (!SPECIALIZATIONS.includes(specialization))
    return res.status(400).json({ message: 'Please choose a valid specialization' });
  if (qualifications.length === 0)
    return res.status(400).json({ message: 'At least one qualification is required' });
  const exp = Number(experienceYears);
  if (!Number.isFinite(exp) || exp < 0 || exp > 70)
    return res.status(400).json({ message: 'Experience must be between 0 and 70 years' });
  if (!registrationNumber || !registrationCouncil)
    return res.status(400).json({ message: 'Medical registration number and council are required' });
  if (!clinic.name || !clinic.address || !clinic.city || !clinic.state)
    return res.status(400).json({ message: 'Clinic name, address, city and state are required' });
  if (!pincodeRegex.test(String(clinic.pincode || '')))
    return res.status(400).json({ message: 'Valid 6-digit pincode is required' });
  const fee = Number(consultationFee);
  if (!Number.isFinite(fee) || fee < 0 || fee > 100000)
    return res.status(400).json({ message: 'Consultation fee is invalid' });

  const online = modes.online !== false;
  const inPerson = modes.inPerson !== false;
  if (!online && !inPerson)
    return res.status(400).json({ message: 'Choose at least one consultation mode' });

  // ---- Duplicate checks ----
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: 'This email is already registered' });
  if (await Doctor.findOne({
    registrationNumber: registrationNumber.trim(),
    registrationCouncil: registrationCouncil.trim(),
  }))
    return res.status(409).json({ message: 'This registration number is already submitted' });

  // ---- Create User (role: doctor) then Doctor (status: pending) ----
  const user = await User.create({ name, email, phone, password, role: 'doctor' });

  let doctor;
  try {
    doctor = await Doctor.create({
      user: user._id,
      name: name.trim(),
      specialization,
      qualifications,
      experienceYears: exp,
      bio,
      languages,
      registrationNumber,
      registrationCouncil,
      clinic: {
        name: clinic.name,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        pincode: String(clinic.pincode),
      },
      consultationFee: fee,
      modes: { online, inPerson },
      payAtClinic: Boolean(payAtClinic),
      status: 'pending', // body se status KABHI nahi lete
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id); // adhura user na rahe
    throw err;
  }

  res.status(201).json({
    message: 'Application submitted. You will appear publicly after admin approval.',
    user,
    token: generateToken(user),
    doctor: { id: doctor._id, status: doctor.status },
  });
});

// GET /api/doctors  (public, sirf approved)
// export const listDoctors = asyncHandler(async (req, res) => {
//   const { q, specialization, city, mode, maxFee } = req.query;
//   const page = Math.max(parseInt(req.query.page) || 1, 1);
//   const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

//   const filter = { status: 'approved' };

//   if (q) {
//     const rx = new RegExp(escapeRegex(q.trim()), 'i'); // 'i' = case-insensitive
//     filter.$or = [{ name: rx }, { specialization: rx }, { 'clinic.city': rx }];
//   }
//   if (specialization) {
//     filter.specialization = new RegExp(`^${escapeRegex(specialization.trim())}$`, 'i');
//   }
//   if (city) {
//     filter['clinic.city'] = new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
//   }
//   if (mode === 'online') filter['modes.online'] = true;
//   if (mode === 'in-person') filter['modes.inPerson'] = true;
//   if (maxFee && Number.isFinite(Number(maxFee))) filter.consultationFee = { $lte: Number(maxFee) };

//   const [total, doctors] = await Promise.all([
//     Doctor.countDocuments(filter),
//     Doctor.find(filter)
//       .select(PUBLIC_EXCLUDE)
//       .sort({ 'rating.value': -1, experienceYears: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit),
//   ]);

//   res.json({ total, page, pages: Math.ceil(total / limit), doctors });
// });

const isNum = (v) => v !== undefined && v !== '' && Number.isFinite(Number(v));
const exactRx = (text) => new RegExp(`^${escapeRegex(String(text).trim())}$`, 'i');

const SORTS = {
  rating: { 'rating.value': -1, experienceYears: -1, _id: 1 },
  fee_asc: { consultationFee: 1, _id: 1 },
  fee_desc: { consultationFee: -1, _id: 1 },
  exp: { experienceYears: -1, _id: 1 },
};

// GET /api/doctors/cities  (filter dropdown ke liye)
export const getCities = asyncHandler(async (req, res) => {
  const cities = await Doctor.distinct('clinic.city', { status: 'approved' });
  res.json({ cities: cities.sort((a, b) => a.localeCompare(b)) });
});

// GET /api/doctors  (public, sirf approved)
export const listDoctors = asyncHandler(async (req, res) => {
  const { q, specialization, city, mode, minFee, maxFee, minExp, sort, lat, lng, radius } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

  const filter = { status: 'approved' };

  if (specialization) filter.specialization = exactRx(specialization);
  if (city) filter['clinic.city'] = exactRx(city);
  if (mode === 'online') filter['modes.online'] = true;
  if (mode === 'in-person') filter['modes.inPerson'] = true;

  const fee = {};
  if (isNum(minFee)) fee.$gte = Number(minFee);
  if (isNum(maxFee)) fee.$lte = Number(maxFee);
  if (Object.keys(fee).length) filter.consultationFee = fee;

  if (isNum(minExp)) filter.experienceYears = { $gte: Number(minExp) };

  // Nearby: radius km ko radians mein badalte hain (earth radius 6378.1 km)
  if (isNum(lat) && isNum(lng)) {
    const km = isNum(radius) ? Math.min(Number(radius), 500) : 10;
    filter['clinic.location'] = {
      $geoWithin: { $centerSphere: [[Number(lng), Number(lat)], km / 6378.1] },
    };
  }

  // ---- Smart search ----
  let interpreted = null;
  let nameTokens = [];
  if (q && String(q).trim()) {
    const cities = await Doctor.distinct('clinic.city', { status: 'approved' });
    const parsed = parseQuery(q, cities);
    interpreted = {
      specialization: parsed.specialization,
      city: parsed.city,
      name: parsed.nameTokens.join(' '),
    };
    if (!specialization && parsed.specialization) filter.specialization = exactRx(parsed.specialization);
    if (!city && parsed.city) filter['clinic.city'] = exactRx(parsed.city);
    nameTokens = parsed.nameTokens;
  }

  let finalFilter = filter;
  if (nameTokens.length) {
    const direct = {
      ...filter,
      $and: nameTokens.map((t) => ({ name: new RegExp(escapeRegex(t), 'i') })),
    };
    if ((await Doctor.countDocuments(direct)) > 0) {
      finalFilter = direct;
    } else {
      const candidates = await Doctor.find(filter).select('name');
      const ids = candidates
        .filter((c) => {
          const words = c.name.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
          return nameTokens.every((t) =>
            words.some((w) => levenshtein(t, w) <= allowedDistance(t))
          );
        })
        .map((c) => c._id);
      finalFilter = { ...filter, _id: { $in: ids } };
    }
  }

  const [total, doctors] = await Promise.all([
    Doctor.countDocuments(finalFilter),
    Doctor.find(finalFilter)
      .select(PUBLIC_EXCLUDE)
      .sort(SORTS[sort] || SORTS.rating)
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({ total, page, pages: Math.ceil(total / limit), interpreted, doctors });
});

// GET /api/doctors/:id  (public, sirf approved)
export const getDoctor = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Doctor not found' });

  const doctor = await Doctor.findOne({ _id: req.params.id, status: 'approved' }).select(PUBLIC_EXCLUDE);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  res.json({ doctor });
});

// GET /api/doctors/me/profile  (sirf doctor, apna profile, status ke saath)
export const getMyProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  res.json({ doctor });
});

// PUT /api/doctors/me/profile  (sirf safe fields)
export const updateMyProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  // Verification wali fields (specialization, registration, status) yahan se nahi badalti
  const { bio, consultationFee, modes, payAtClinic, clinic, languages } = req.body;

  if (bio !== undefined) doctor.bio = String(bio).slice(0, 1000);
  if (languages !== undefined) doctor.languages = toList(languages);
  if (payAtClinic !== undefined) doctor.payAtClinic = Boolean(payAtClinic);

  if (consultationFee !== undefined) {
    const fee = Number(consultationFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000)
      return res.status(400).json({ message: 'Consultation fee is invalid' });
    doctor.consultationFee = fee;
  }

  if (modes !== undefined) {
    const online = modes.online ?? doctor.modes.online;
    const inPerson = modes.inPerson ?? doctor.modes.inPerson;
    if (!online && !inPerson)
      return res.status(400).json({ message: 'Choose at least one consultation mode' });
    doctor.modes = { online: Boolean(online), inPerson: Boolean(inPerson) };
  }

  if (clinic) {
    ['name', 'address', 'city', 'state', 'pincode'].forEach((key) => {
      if (clinic[key] !== undefined && String(clinic[key]).trim()) {
        doctor.clinic[key] = String(clinic[key]).trim();
      }
    });
    if (!pincodeRegex.test(doctor.clinic.pincode))
      return res.status(400).json({ message: 'Valid 6-digit pincode is required' });
  }

  await doctor.save();
  res.json({ doctor });
});