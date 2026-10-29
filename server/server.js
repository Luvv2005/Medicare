import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminVerifyRoutes from './routes/adminVerifyRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import Appointment from './models/Appointment.js';
import { paymentMode } from './config/payment.js';
import { webhook } from './controllers/paymentController.js';
import { releaseExpiredOrders } from './utils/stock.js';
import { settleMockRefunds, syncRazorpayRefunds } from './utils/refunds.js';
import { expireOffers } from './utils/waitlist.js';
import { sanitizeBody } from './utils/sanitize.js';
import { apiLimiter } from './middleware/limiters.js';
import { initSocket } from './socket.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const prod = process.env.NODE_ENV === 'production';

const required = prod ? ['JWT_SECRET', 'MONGO_URI', 'CLIENT_URL', 'PUBLIC_API_URL'] : ['JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (prod && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is too short for production (use 64+ random characters)');
  process.exit(1);
}

const app = express();
if (prod) app.set('trust proxy', 1); // Render ek proxy ke peeche hai

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Razorpay webhook: signature ke liye RAW body chahiye, isliye express.json se PEHLE
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhook);

app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(morgan(prod ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediCare API is running', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-verify', adminVerifyRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(notFound);
app.use(errorHandler);

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
  if (paymentMode() === 'razorpay' && !process.env.RAZORPAY_WEBHOOK_SECRET)
    console.warn('WARNING: RAZORPAY_WEBHOOK_SECRET missing. Payments confirmed only via browser verify.');

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
      const n = await syncRazorpayRefunds();
      if (n) console.log(`Synced ${n} Razorpay refund(s)`);
    } catch (err) {
      console.error('Razorpay refund sync failed:', err.message);
    }
  }, 5 * 60 * 1000);

  setInterval(async () => {
    try {
      const n = await expireOffers();
      if (n) console.log(`Expired ${n} waiting-list offer(s)`);
    } catch (err) {
      console.error('Offer sweep failed:', err.message);
    }
  }, 20 * 1000);
});