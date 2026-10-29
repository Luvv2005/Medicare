import Refund from '../models/Refund.js';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import { notify } from './notify.js';
import { getRazorpay } from '../config/razorpay.js';
import { MOCK_REFUND_SETTLE_SECONDS } from '../config/policy.js';

const modelFor = (type) => (type === 'appointment' ? Appointment : Order);

const sync = (refund) =>
  modelFor(refund.sourceType).updateOne({ _id: refund.sourceId }, { refundStatus: refund.status });

const notifyRefund = (refund) => {
  const link = refund.sourceType === 'order' ? '/orders' : '/dashboard';
  const test = refund.isSimulated ? ' (test mode)' : '';
  const map = {
    initiated: [
      'Refund initiated',
      `Your refund of ₹${refund.amount} has been initiated${test}. How soon it reaches you depends on your bank or payment provider.`,
    ],
    processed: [
      'Refund processed',
      `Your refund of ₹${refund.amount} has been processed${test}. Your bank may take a few more days to show it.`,
    ],
    failed: ['Refund failed', `Your refund of ₹${refund.amount} could not be processed. It will be retried.`],
  };
  const m = map[refund.status];
  if (!m) return null;
  return notify(refund.patient, { type: 'refund', title: m[0], message: m[1], link });
};

// Gateway ko refund request bhejna
const sendToGateway = async (refund) => {
  if (refund.provider === 'razorpay') {
    const rz = getRazorpay();
    if (!rz) throw new Error('Razorpay is not configured');
    // Retry par pehle purana refund check karo, taaki duplicate refund na bane
    if (refund.providerRefundId) {
      const old = await rz.refunds.fetch(refund.providerRefundId).catch(() => null);
      if (old && old.status !== 'failed') return { providerRefundId: old.id };
    }
    const r = await rz.payments.refund(refund.providerPaymentId, {
      amount: Math.round(refund.amount * 100),
      speed: 'normal',
      receipt: String(refund._id),
      notes: { refundId: String(refund._id) },
    });
    return { providerRefundId: r.id };
  }
  return { providerRefundId: `mock_rfnd_${refund._id}_${refund.attempts}` };
};

// pending ya failed refund ko 'initiated' karta hai (atomic claim)
export const initiateRefund = async (refundId) => {
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ['pending', 'failed'] } },
    { status: 'initiated', initiatedAt: new Date(), failureReason: '', $inc: { attempts: 1 } },
    { new: true }
  );
  if (!refund) return null;

  try {
    const out = await sendToGateway(refund);
    refund.providerRefundId = out.providerRefundId;
  } catch (err) {
    refund.status = 'failed';
    refund.failedAt = new Date();
    refund.failureReason = String(err?.error?.description || err.message).slice(0, 200);
  }
  await refund.save();
  await sync(refund);
  await notifyRefund(refund);
  return refund;
};

// Cancel ke baad refund shuru. Asli payment (mock_ se shuru nahi) ka refund Razorpay se jata hai.
export const startRefund = async ({ sourceType, source, amount, reason, providerPaymentId }) => {
  if (!(amount > 0)) return null;
  const live = Boolean(providerPaymentId) && !String(providerPaymentId).startsWith('mock_');

  let refund;
  try {
    refund = await Refund.create({
      sourceType,
      sourceId: source._id,
      patient: sourceType === 'appointment' ? source.patient : source.user,
      amount,
      reason,
      provider: live ? 'razorpay' : 'mock',
      providerPaymentId,
      isSimulated: !live,
    });
  } catch (err) {
    if (err.code === 11000) return Refund.findOne({ sourceType, sourceId: source._id });
    throw err;
  }

  await modelFor(sourceType).updateOne(
    { _id: source._id },
    { refundStatus: 'pending', refundAmount: amount }
  );
  return (await initiateRefund(refund._id)) || refund;
};

// Razorpay webhook ya sync se: gateway ne jo bataya wahi status
export const applyGatewayRefund = async (providerRefundId, status, reason = '') => {
  const update =
    status === 'processed'
      ? { status: 'processed', processedAt: new Date() }
      : { status: 'failed', failedAt: new Date(), failureReason: reason || 'Gateway reported failure' };
  const refund = await Refund.findOneAndUpdate({ providerRefundId, status: 'initiated' }, update, { new: true });
  if (!refund) return null;
  await sync(refund);
  await notifyRefund(refund);
  return refund;
};

// Webhook miss ho jaye to bhi status theek ho: initiated Razorpay refunds ko poochho
export const syncRazorpayRefunds = async () => {
  const rz = getRazorpay();
  if (!rz) return 0;
  const due = await Refund.find({
    provider: 'razorpay',
    status: 'initiated',
    providerRefundId: { $exists: true },
    initiatedAt: { $lte: new Date(Date.now() - 2 * 60 * 1000) },
  }).limit(50);

  let count = 0;
  for (const r of due) {
    try {
      const g = await rz.refunds.fetch(r.providerRefundId);
      if (g.status === 'processed' && (await applyGatewayRefund(r.providerRefundId, 'processed'))) count++;
      if (g.status === 'failed' && (await applyGatewayRefund(r.providerRefundId, 'failed'))) count++;
    } catch (err) {
      console.error('Refund sync failed:', err.message);
    }
  }
  return count;
};

// Sirf TEST: initiated refund ko failed bana deta hai
export const markRefundFailed = async (refundId, reason) => {
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: 'initiated' },
    { status: 'failed', failedAt: new Date(), failureReason: reason },
    { new: true }
  );
  if (!refund) return null;
  await sync(refund);
  await notifyRefund(refund);
  return refund;
};

// Simulated gateway: sirf mock refunds
export const settleMockRefunds = async () => {
  const cutoff = new Date(Date.now() - MOCK_REFUND_SETTLE_SECONDS * 1000);
  const due = await Refund.find({
    provider: 'mock',
    status: 'initiated',
    initiatedAt: { $lte: cutoff },
  }).select('_id');

  let count = 0;
  for (const { _id } of due) {
    const refund = await Refund.findOneAndUpdate(
      { _id, status: 'initiated' },
      { status: 'processed', processedAt: new Date() },
      { new: true }
    );
    if (refund) {
      await sync(refund);
      await notifyRefund(refund);
      count++;
    }
  }
  return count;
};