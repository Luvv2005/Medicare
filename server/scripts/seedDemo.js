import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Appointment from '../models/Appointment.js';

const removeOnly = process.argv.includes('--remove');

// ---------- Safety guards ----------
if (process.env.NODE_ENV === 'production') {
  console.error('REFUSED: demo seed/remove is disabled when NODE_ENV=production');
  process.exit(1);
}
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('REFUSED: set ALLOW_DEMO_SEED=true in server/.env (development only)');
  process.exit(1);
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@12345';

// Coordinates approximate hain ([longitude, latitude]). Sab demo data hai.
const demoDoctors = [
  { name: 'Dr. Simran Kaur', spec: 'General Physician', exp: 12, quals: ['MBBS', 'MD Medicine'], fee: 400, rating: 4.8, ratingCount: 120,
    clinic: { name: 'Kaur Family Clinic', address: 'Sunam Road', city: 'Malerkotla', state: 'Punjab', pincode: '148023', coords: [75.88, 30.53] },
    modes: { online: true, inPerson: true } },
  { name: 'Dr. Arjun Mehta', spec: 'Cardiologist', exp: 18, quals: ['MBBS', 'MD', 'DM Cardiology'], fee: 900, rating: 4.9, ratingCount: 210,
    clinic: { name: 'Heart Care Centre', address: 'Model Town', city: 'Ludhiana', state: 'Punjab', pincode: '141002', coords: [75.85, 30.9] },
    modes: { online: true, inPerson: true } },
  { name: 'Dr. Neha Sharma', spec: 'Dermatologist', exp: 8, quals: ['MBBS', 'MD Dermatology'], fee: 600, rating: 4.6, ratingCount: 85,
    clinic: { name: 'Skin & Glow Clinic', address: 'Sector 17', city: 'Chandigarh', state: 'Chandigarh', pincode: '160017', coords: [76.78, 30.73] },
    modes: { online: true, inPerson: false } },
  { name: 'Dr. Gurpreet Singh', spec: 'Pediatrician', exp: 15, quals: ['MBBS', 'MD Pediatrics'], fee: 500, rating: 4.7, ratingCount: 140,
    clinic: { name: 'Little Stars Hospital', address: 'Lawrence Road', city: 'Amritsar', state: 'Punjab', pincode: '143001', coords: [74.87, 31.63] },
    modes: { online: false, inPerson: true } },
  { name: 'Dr. Ritu Verma', spec: 'Orthopedic', exp: 10, quals: ['MBBS', 'MS Orthopedics'], fee: 700, rating: 4.5, ratingCount: 64,
    clinic: { name: 'Bone & Joint Care', address: 'Leela Bhawan Market', city: 'Patiala', state: 'Punjab', pincode: '147001', coords: [76.39, 30.34] },
    modes: { online: true, inPerson: true } },
  { name: 'Dr. Aarav Verma', spec: 'General Physician', exp: 5, quals: ['MBBS'], fee: 300, rating: 4.0, ratingCount: 22,
    clinic: { name: 'City Health Clinic', address: 'Model Town', city: 'Jalandhar', state: 'Punjab', pincode: '144003', coords: [75.58, 31.33] },
    modes: { online: true, inPerson: true } },
  { name: 'Dr. Vikram Malhotra', spec: 'Cardiologist', exp: 12, quals: ['MBBS', 'MD', 'DM Cardiology'], fee: 800, rating: 4.3, ratingCount: 58,
    clinic: { name: 'Malhotra Heart Clinic', address: 'Mall Road', city: 'Bathinda', state: 'Punjab', pincode: '151001', coords: [74.95, 30.21] },
    modes: { online: true, inPerson: true } },
  { name: 'Dr. Neelam Thakur', spec: 'Dermatologist', exp: 19, quals: ['MBBS', 'MD Dermatology'], fee: 550, rating: 4.6, ratingCount: 97,
    clinic: { name: 'Thakur Skin Clinic', address: 'Court Road', city: 'Barnala', state: 'Punjab', pincode: '148101', coords: [75.55, 30.38] },
    modes: { online: true, inPerson: true } },
  // Ye PENDING hai: admin approval test karne ke liye. Public list mein nahi dikhega.
  { name: 'Dr. Rohit Bansal', spec: 'ENT Specialist', exp: 7, quals: ['MBBS', 'MS ENT'], fee: 450, rating: 0, ratingCount: 0, status: 'pending',
    clinic: { name: 'Bansal ENT Clinic', address: 'Bus Stand Road', city: 'Barnala', state: 'Punjab', pincode: '148101', coords: [75.54, 30.37] },
    modes: { online: true, inPerson: true } },
];

// const removeDemo = async () => {
//   // SIRF isDemo: true. Real data ko kabhi nahi chhuta.
//   const demoUsers = await User.find({ isDemo: true }).select('_id');
//   const ids = demoUsers.map((u) => u._id);
//   const d = await Doctor.deleteMany({ isDemo: true });
//   const u = await User.deleteMany({ isDemo: true, _id: { $in: ids } });
//   console.log(`Removed demo doctors: ${d.deletedCount}, demo users: ${u.deletedCount}`);
// };

const removeDemo = async () => {
  // SIRF demo records. Real doctors/users/appointments ko nahi chhuta.
  const demoDocs = await Doctor.find({ isDemo: true }).select('_id');
  const docIds = demoDocs.map((d) => d._id);

  const a = await Appointment.deleteMany({ doctor: { $in: docIds } });
  const av = await Availability.deleteMany({ doctor: { $in: docIds } });
  const d = await Doctor.deleteMany({ isDemo: true });
  const u = await User.deleteMany({ isDemo: true });
  console.log(
    `Removed demo doctors: ${d.deletedCount}, demo users: ${u.deletedCount}, availability: ${av.deletedCount}, demo-doctor appointments: ${a.deletedCount}`
  );
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name} @ ${mongoose.connection.host}`);

  await removeDemo();
  if (removeOnly) return;

  for (let i = 0; i < demoDoctors.length; i++) {
    const d = demoDoctors[i];
    const user = await User.create({
      name: d.name,
      email: `demo.doctor${i + 1}@demo.medicare.local`,
      phone: '',
      password: DEMO_PASSWORD, // create() se hash hota hai
      role: 'doctor',
      isDemo: true,
    });

    const doctor = await Doctor.create({
      user: user._id,
      name: d.name,
      specialization: d.spec,
      qualifications: d.quals,
      experienceYears: d.exp,
      bio: 'DEMO PROFILE: sample data for development only.',
      languages: ['English', 'Hindi', 'Punjabi'],
      registrationNumber: `DEMO-${String(i + 1).padStart(4, '0')}`,
      registrationCouncil: 'Demo Council',
      clinic: {
        name: d.clinic.name,
        address: d.clinic.address,
        city: d.clinic.city,
        state: d.clinic.state,
        pincode: d.clinic.pincode,
        location: { type: 'Point', coordinates: d.clinic.coords },
      },
      consultationFee: d.fee,
      modes: d.modes,
      payAtClinic: d.modes.inPerson,
      status: d.status || 'approved',
      rating: { value: d.rating, count: d.ratingCount, isDemo: true },
      isDemo: true,
    });

    // Demo availability: Mon-Sat, subah 10-1 aur shaam 5-8, 15 minute ke slots
    const demoSessions = [];
    for (let day = 1; day <= 6; day++) {
      demoSessions.push({ day, start: '10:00', end: '13:00', mode: 'both' });
      demoSessions.push({ day, start: '17:00', end: '20:00', mode: 'both' });
    }
    await Availability.create({
      doctor: doctor._id,
      slotMinutes: 15,
      sessions: demoSessions,
      isDemo: true,
    });
  }

  console.log(`Seeded ${demoDoctors.length} demo doctors (password for all: ${DEMO_PASSWORD})`);
};

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());