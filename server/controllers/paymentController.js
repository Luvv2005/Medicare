import crypto from 'crypto';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Paymenttemp.js';
import Order from '../models/Order.js';
import Refund from '../models/Refund.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paymentMode } from '../config/payment.js';
import { getRazorpay } from '../config/razorpay.js';
import { notifyBooking } from '../utils/notify.js';
import { startRefund, applyGatewayRefund } from '../utils/refunds.js';

const hmacOk = (secret, payload, signature) => {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// GET /api/payments/config
export const getConfig = (req, res) => {
  res.json({ mode: paymentMode() });
};

// ---------- Mock (sirf development) ----------

// POST /api/payments/mock-confirm   body: { appointmentId, outcome }
export const mockConfirm = asyncHandler(async (req, res) => {
  if (paymentMode() !== 'mock')
    return res.status(503).json({ message: 'Test payment is not available.' });

  const { appointmentId, outcome } = req.body;
  if (!mongoose.isValidObjectId(appointmentId))
    return res.status(400).json({ message: 'Invalid appointment' });
  if (!['success', 'failure'].includes(outcome))
    return res.status(400).json({ message: 'outcome must be success or failure' });

  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });

  if (appt.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This appointment is not an online-payment booking' });
  if (appt.paymentStatus === 'paid' && appt.status === 'confirmed')
    return res.json({ message: 'Payment already completed', appointment: appt });
  if (appt.status !== 'held')
    return res.status(400).json({ message: `This appointment is ${appt.status}, payment is not possible` });
  if (!appt.holdExpiresAt || appt.holdExpiresAt <= new Date())
    return res.status(400).json({ message: 'Slot hold expired. Please book the slot again.' });

  const stamp = `${appt._id}_${Date.now()}`;

  if (outcome === 'failure') {
    await Payment.create({
      appointment: appt._id, patient: req.user._id, amount: appt.amount,
      provider: 'mock', providerOrderId: `mock_order_${stamp}`, status: 'failed', isSimulated: true,
    });
    return res.status(402).json({ message: 'Simulated payment failed. You can try again.' });
  }

  const confirmed = await Appointment.findOneAndUpdate(
    { _id: appt._id, patient: req.user._id, status: 'held', isActive: true, holdExpiresAt: { $gt: new Date() } },
    { status: 'confirmed', paymentStatus: 'paid', $unset: { holdExpiresAt: 1 } },
    { new: true }
  );
  if (!confirmed) return res.status(409).json({ message: 'Slot hold expired. Please book the slot again.' });

  await Payment.create({
    appointment: appt._id, patient: req.user._id, amount: appt.amount, provider: 'mock',
    providerOrderId: `mock_order_${stamp}`, providerPaymentId: `mock_pay_${stamp}`,
    status: 'paid', paidAt: new Date(), isSimulated: true,
  });

  await notifyBooking(confirmed);
  res.json({ message: 'Payment successful. Appointment confirmed.', appointment: confirmed });
});

// ---------- Razorpay ----------

const needRazorpay = (res) => {
  const rz = paymentMode() === 'razorpay' ? getRazorpay() : null;
  if (!rz) res.status(503).json({ message: 'Online payment is not available right now.' });
  return rz;
};

const orderResponse = (payment, amountRupees, req, description, prefill) => ({
  orderId: payment.providerOrderId,
  amount: Math.round(amountRupees * 100),
  currency: 'INR',
  keyId: process.env.RAZORPAY_KEY_ID, // public key, secret nahi
  description,
  prefill,
});

// POST /api/payments/create-order   body: { appointmentId }
export const createAppointmentOrder = asyncHandler(async (req, res) => {
  const rz = needRazorpay(res);
  if (!rz) return undefined;

  const { appointmentId } = req.body;
  if (!mongoose.isValidObjectId(appointmentId)) return res.status(400).json({ message: 'Invalid appointment' });

  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (appt.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This appointment is not an online-payment booking' });
  if (appt.status !== 'held')
    return res.status(400).json({ message: `This appointment is ${appt.status}, payment is not needed` });
  if (!appt.holdExpiresAt || appt.holdExpiresAt <= new Date())
    return res.status(400).json({ message: 'Slot hold expired. Please book the slot again.' });
  if (appt.amount < 1) return res.status(400).json({ message: 'Amount is too low for online payment' });

  // Retry par wahi Razorpay order dobara use hota hai
  let payment = await Payment.findOne({ appointment: appt._id, status: 'created', provider: 'razorpay' });
  if (!payment) {
    const o = await rz.orders.create({
      amount: Math.round(appt.amount * 100), currency: 'INR',
      receipt: `appt_${appt._id}`, notes: { appointmentId: String(appt._id) },
    });
    payment = await Payment.create({
      appointment: appt._id, patient: req.user._id, amount: appt.amount,
      provider: 'razorpay', providerOrderId: o.id,
    });
  }

  return res.json(
    orderResponse(payment, appt.amount, req, 'Doctor consultation', {
      name: appt.patientName, contact: appt.patientPhone, email: req.user.email,
    })
  );
});

// POST /api/payments/orders/:id/create-order   (medicine order)
export const createMedicineOrder = asyncHandler(async (req, res) => {
  const rz = needRazorpay(res);
  if (!rz) return undefined;

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This order is not an online-payment order' });
  if (order.status !== 'pending_payment')
    return res.status(400).json({ message: `This order is ${order.status}, payment is not needed` });
  if (!order.holdExpiresAt || order.holdExpiresAt <= new Date())
    return res.status(400).json({ message: 'Payment time expired. Please place the order again.' });

  let payment = await Payment.findOne({ order: order._id, status: 'created', provider: 'razorpay' });
  if (!payment) {
    const o = await rz.orders.create({
      amount: Math.round(order.total * 100), currency: 'INR',
      receipt: `ord_${order._id}`, notes: { orderId: String(order._id), orderNo: order.orderNo },
    });
    payment = await Payment.create({
      order: order._id, patient: req.user._id, amount: order.total,
      provider: 'razorpay', providerOrderId: o.id,
    });
  }

  return res.json(
    orderResponse(payment, order.total, req, `Medicine order ${order.orderNo}`, {
      name: order.address.name, contact: order.address.phone, email: req.user.email,
    })
  );
});

// Payment confirm hone par: appointment/order ko confirm karo. Slot/order chhoot gaya ho to full refund.
async function finalize(payment, razorpayPaymentId) {
  let marked;
  try {
    marked = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'paid' } },
      { status: 'paid', providerPaymentId: razorpayPaymentId, paidAt: new Date() },
      { new: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      console.error(`DUPLICATE PAYMENT ${razorpayPaymentId} for one booking. Refund it manually in Razorpay.`);
      return { duplicate: true };
    }
    throw err;
  }
  if (!marked) return { already: true };

  if (marked.appointment) {
    const confirmed = await Appointment.findOneAndUpdate(
      { _id: marked.appointment, status: 'held', isActive: true },
      { status: 'confirmed', paymentStatus: 'paid', $unset: { holdExpiresAt: 1 } },
      { new: true }
    );
    if (confirmed) {
      await notifyBooking(confirmed);
      return { appointment: confirmed };
    }
    const appt = await Appointment.findByIdAndUpdate(marked.appointment, { paymentStatus: 'paid' }, { new: true });
    if (appt)
      await startRefund({
        sourceType: 'appointment', source: appt, amount: marked.amount,
        reason: 'Slot was no longer reserved when payment arrived', providerPaymentId: razorpayPaymentId,
      });
    return { late: true };
  }

  const paid = await Order.findOneAndUpdate(
    { _id: marked.order, status: 'pending_payment' },
    {
      status: 'placed', paymentStatus: 'paid',
      payment: { provider: 'razorpay', providerPaymentId: razorpayPaymentId, paidAt: new Date(), isSimulated: false },
      $unset: { holdExpiresAt: 1 },
    },
    { new: true }
  );
  if (paid) return { order: paid };

  const late = await Order.findByIdAndUpdate(marked.order, { paymentStatus: 'paid' }, { new: true });
  if (late)
    await startRefund({
      sourceType: 'order', source: late, amount: marked.amount,
      reason: 'Order was no longer active when payment arrived', providerPaymentId: razorpayPaymentId,
    });
  return { late: true };
}

const currentDoc = async (payment) =>
  payment.appointment
    ? { appointment: await Appointment.findById(payment.appointment) }
    : { order: await Order.findById(payment.order) };

// POST /api/payments/verify   body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
  if (![oid, pid, sig].every((v) => typeof v === 'string' && v))
    return res.status(400).json({ message: 'Missing payment details' });
  if (!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ message: 'Online payment is not available.' });

  const payment = await Payment.findOne({ providerOrderId: oid, patient: req.user._id, provider: 'razorpay' });
  if (!payment) return res.status(404).json({ message: 'Payment order not found' });

  if (!hmacOk(process.env.RAZORPAY_KEY_SECRET, `${oid}|${pid}`, sig))
    return res.status(400).json({ message: 'Payment verification failed' });

  if (payment.status === 'paid') return res.json({ message: 'Payment already verified', ...(await currentDoc(payment)) });

  const out = await finalize(payment, pid);
  if (out.late)
    return res.status(409).json({
      message: `Your payment (ref ${pid}) was received, but the booking or order was no longer available. A full refund has been started. How soon it reaches you depends on your bank.`,
    });
  if (out.duplicate)
    return res.status(409).json({ message: 'This booking was already paid. Please contact support for a refund of the extra payment.' });

  const doc = out.appointment || out.order ? out : await currentDoc(payment);
  return res.json({ message: 'Payment verified', ...doc });
});

// POST /api/payments/webhook   (Razorpay khud bulata hai. Raw body zaroori hai.)
export const webhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: 'Webhook is not configured' });

  const sig = req.headers['x-razorpay-signature'];
  if (!Buffer.isBuffer(req.body) || !hmacOk(secret, req.body, sig))
    return res.status(400).json({ message: 'Invalid signature' });

  let evt;
  try {
    evt = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
    const p = evt.payload?.payment?.entity;
    if (p?.order_id) {
      const payment = await Payment.findOne({ providerOrderId: p.order_id, provider: 'razorpay' });
      if (payment && payment.status !== 'paid') await finalize(payment, p.id);
    }
  } else if (evt.event === 'refund.processed') {
    const r = evt.payload?.refund?.entity;
    if (r?.id) await applyGatewayRefund(r.id, 'processed');
  } else if (evt.event === 'refund.failed') {
    const r = evt.payload?.refund?.entity;
    if (r?.id) await applyGatewayRefund(r.id, 'failed', 'Refund failed at gateway');
  }

  res.json({ ok: true });
});

// GET /api/payments/history   (patient, sirf apna)
export const getHistory = asyncHandler(async (req, res) => {
  const [payments, orders, refunds] = await Promise.all([
    Payment.find({ patient: req.user._id, status: 'paid', appointment: { $exists: true } }).populate({
      path: 'appointment',
      select: 'date startTime doctor',
      populate: { path: 'doctor', select: 'name' },
    }),
    Order.find({ user: req.user._id, paymentStatus: 'paid' }).select('orderNo total paymentMethod payment createdAt'),
    Refund.find({ patient: req.user._id }).sort({ createdAt: -1 }),
  ]);

  const paid = [
    ...payments.map((p) => ({
      id: String(p._id),
      kind: 'Appointment',
      title: `Consultation with ${p.appointment?.doctor?.name || 'doctor'}${p.appointment ? ` on ${p.appointment.date}` : ''}`,
      amount: p.amount,
      date: p.paidAt || p.createdAt,
      method: 'Online',
      reference: p.providerPaymentId || '',
      simulated: Boolean(p.isSimulated),
    })),
    ...orders.map((o) => ({
      id: String(o._id),
      kind: 'Order',
      title: `Medicine order ${o.orderNo}`,
      amount: o.total,
      date: o.payment?.paidAt || o.createdAt,
      method: o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online',
      reference: o.payment?.providerPaymentId || '',
      simulated: Boolean(o.payment?.isSimulated),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    payments: paid,
    refunds: refunds.map((r) => ({
      id: String(r._id), sourceType: r.sourceType, amount: r.amount, status: r.status,
      createdAt: r.createdAt, processedAt: r.processedAt, simulated: r.isSimulated,
    })),
  });
});