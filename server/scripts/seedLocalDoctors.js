import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Appointment from '../models/Appointment.js';

if (process.env.NODE_ENV === 'production') {
  console.error('REFUSED: demo seed is disabled when NODE_ENV=production');
  process.exit(1);
}
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('REFUSED: set ALLOW_DEMO_SEED=true in server/.env (development only)');
  process.exit(1);
}

// Coordinates approximate hain. Sab DEMO data.
const LOCAL = [
  { name: 'Dr. Harjit Singh', spec: 'General Practitioner', exp: 14, quals: ['MBBS'], fee: 150, clinic: { name: 'Singh Village Clinic', address: 'Main Bazaar', city: 'Dhuri', state: 'Punjab', pincode: '148024', coords: [75.868, 30.368] } },
  { name: 'Dr. Kuldeep Kaur', spec: 'General Practitioner', exp: 9, quals: ['MBBS'], fee: 120, clinic: { name: 'Kaur Health Centre', address: 'Bus Stand Road', city: 'Ahmedgarh', state: 'Punjab', pincode: '148021', coords: [75.826, 30.678] } },
  { name: 'Dr. Ramesh Sharma', spec: 'AYUSH Practitioner', exp: 12, quals: ['BAMS'], fee: 100, clinic: { name: 'Sharma Ayurvedic Clinic', address: 'Old Market', city: 'Amloh', state: 'Punjab', pincode: '147203', coords: [76.2, 30.61] } },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name}`);

  const old = await Doctor.find({ isDemo: true, doctorType: 'local' }).select('_id user');
  const ids = old.map((d) => d._id);
  await Appointment.deleteMany({ doctor: { $in: ids } });
  await Availability.deleteMany({ doctor: { $in: ids } });
  await Doctor.deleteMany({ _id: { $in: ids } });
  await User.deleteMany({ _id: { $in: old.map((d) => d.user) }, isDemo: true });

  for (let i = 0; i < LOCAL.length; i++) {
    const d = LOCAL[i];
    const user = await User.create({
      name: d.name,
      email: `demo.local${i + 1}@demo.medicare.local`,
      password: process.env.DEMO_PASSWORD || 'Demo@12345',
      role: 'doctor',
      isDemo: true,
    });
    const doctor = await Doctor.create({
      user: user._id,
      name: d.name,
      doctorType: 'local',
      specialization: d.spec,
      qualifications: d.quals,
      experienceYears: d.exp,
      bio: 'DEMO PROFILE: sample local clinic doctor for development only.',
      languages: ['Punjabi', 'Hindi'],
      registrationNumber: `DEMO-L${String(i + 1).padStart(3, '0')}`,
      registrationCouncil: 'Demo Council',
      clinic: {
        name: d.clinic.name, address: d.clinic.address, city: d.clinic.city,
        state: d.clinic.state, pincode: d.clinic.pincode,
        location: { type: 'Point', coordinates: d.clinic.coords },
      },
      consultationFee: d.fee,
      modes: { online: false, inPerson: true },
      payAtClinic: true,
      status: 'approved',
      rating: { value: 4.4, count: 30, isDemo: true },
      isDemo: true,
    });
    const sessions = [];
    for (let day = 1; day <= 6; day++) {
      sessions.push({ day, start: '09:00', end: '13:00', mode: 'in-person' });
      sessions.push({ day, start: '16:00', end: '19:00', mode: 'in-person' });
    }
    await Availability.create({ doctor: doctor._id, slotMinutes: 15, sessions, isDemo: true });
  }
  console.log(`Seeded ${LOCAL.length} demo local clinic doctors (password: ${process.env.DEMO_PASSWORD || 'Demo@12345'})`);
};

run()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());