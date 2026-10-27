import 'dotenv/config';
import http from 'http';
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
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import Appointment from './models/Appointment.js';
import { paymentMode } from './config/payment.js';
import { releaseExpiredOrders } from './utils/stock.js';
import { settleMockRefunds } from './utils/refunds.js';
import { expireOffers } from './utils/waitlist.js';
import { initSocket } from './socket.js';
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
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/waitlist', waitlistRoutes);

app.use(notFound);
app.use(errorHandler);

// Unpaid expired holds aur unpaid orders ko hata do taaki slot/stock free ho jaye
const sweepExpiredHolds = async () => {
  try {
    const r = await Appointment.updateMany(
      { status: 'held', isActive: true, holdExpiresAt: { $lte: new Date() } },
      { status: 'expired', isActive: false }
    );
    if (r.modifiedCount) console.log(`Expired ${r.modifiedCount} unpaid hold(s)`);
    const n = await releaseExpiredOrders();
    if (n) console.log(`Cancelled ${n} unpaid order(s) and released stock`);
  } catch (err) {
    console.error('Hold sweep failed:', err.message);
  }
};

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  console.log(`Payment mode: ${paymentMode()}`);
  sweepExpiredHolds();
  setInterval(sweepExpiredHolds, 60 * 1000);

  setInterval(async () => {
    try {
      const n = await settleMockRefunds();
      if (n) console.log(`Settled ${n} test refund(s)`);
    } catch (err) {
      console.error('Refund sweep failed:', err.message);
    }
  }, 15 * 1000);

  setInterval(async () => {
    try {
      const n = await expireOffers();
      if (n) console.log(`Expired ${n} waiting-list offer(s)`);
    } catch (err) {
      console.error('Offer sweep failed:', err.message);
    }
  }, 20 * 1000);
});