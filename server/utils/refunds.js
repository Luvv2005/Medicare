import Refund from '../models/Refund.js';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import { notify } from './notify.js';
import { MOCK_REFUND_SETTLE_SECONDS } from '../config/policy.js';

const modelFor = (type) => (type === 'appointment' ? Appointment : Order);

// Appointment/order par refundStatus ko Refund record ke saath same rakhta hai
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

// Gateway ko refund request bhejna. Abhi mock. Last step mein yahan Razorpay refund API aayegi.
const sendToGateway = async (refund) => ({
  providerRefundId: `mock_rfnd_${refund._id}_${refund.attempts}`,
});

// pending ya failed refund ko 'initiated' karta hai. Atomic claim: do baar chalane par bhi gateway ko ek hi baar request jati hai.
export const initiateRefund = async (refundId) => {
  const refund = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ['pending', 'failed'] } },
    { status: 'initiated', initiatedAt: new Date(), failureReason: '', $inc: { attempts: 1 } },
    { new: true }
  );
  if (!refund) return null; // pehle hi chal chuka hai

  try {
    const out = await sendToGateway(refund);
    refund.providerRefundId = out.providerRefundId;
  } catch (err) {
    refund.status = 'failed';
    refund.failedAt = new Date();
    refund.failureReason = err.message;
  }
  await refund.save();
  await sync(refund);
  await notifyRefund(refund);
  return refund;
};

// Cancel ke baad refund shuru karta hai. Amount 0 ho to kuch nahi banta.
export const startRefund = async ({ sourceType, source, amount, reason, providerPaymentId }) => {
  if (!(amount > 0)) return null;

  let refund;
  try {
    refund = await Refund.create({
      sourceType,
      sourceId: source._id,
      patient: sourceType === 'appointment' ? source.patient : source.user,
      amount,
      reason,
      provider: 'mock',
      providerPaymentId,
      isSimulated: true,
    });
  } catch (err) {
    // Duplicate request: wahi purana refund wapas do, naya nahi banta
    if (err.code === 11000) return Refund.findOne({ sourceType, sourceId: source._id });
    throw err;
  }

  await modelFor(sourceType).updateOne(
    { _id: source._id },
    { refundStatus: 'pending', refundAmount: amount }
  );
  return (await initiateRefund(refund._id)) || refund;
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

// Simulated gateway: initiated refund kuch der baad 'processed' ho jata hai
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