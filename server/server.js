import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import Appointment from './models/Appointment.js';
import { paymentMode } from './config/payment.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env');
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MediCare API is running',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

// Unpaid expired holds ko hata do taaki slot free ho jaye
const sweepExpiredHolds = async () => {
  try {
    const r = await Appointment.updateMany(
      { status: 'held', isActive: true, holdExpiresAt: { $lte: new Date() } },
      { status: 'expired', isActive: false }
    );
    if (r.modifiedCount) console.log(`Expired ${r.modifiedCount} unpaid hold(s)`);
  } catch (err) {
    console.error('Hold sweep failed:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  console.log(`Payment mode: ${paymentMode()}`);
  sweepExpiredHolds();
  setInterval(sweepExpiredHolds, 60 * 1000);
});