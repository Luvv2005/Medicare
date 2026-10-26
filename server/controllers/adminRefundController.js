import mongoose from 'mongoose';
import Refund from '../models/Refund.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from '../utils/audit.js';
import { paymentMode } from '../config/payment.js';
import { initiateRefund, markRefundFailed } from '../utils/refunds.js';

// GET /api/admin/refunds
export const listRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find()
    .populate('patient', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ count: refunds.length, refunds, mode: paymentMode() });
});

// POST /api/admin/refunds/:id/simulate-failure   (sirf test mode)
export const simulateFailure = asyncHandler(async (req, res) => {
  if (paymentMode() !== 'mock')
    return res.status(503).json({ message: 'Failure simulation is available only in test mode' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Refund not found' });

  const refund = await markRefundFailed(req.params.id, 'Simulated gateway failure');
  if (!refund) return res.status(400).json({ message: 'Only an initiated refund can be failed' });

  await logAudit(req, 'REFUND_FAILURE_SIMULATED', 'Refund', refund._id, {});
  res.json({ refund });
});

// POST /api/admin/refunds/:id/retry   (sirf failed refund, wahi record dobara chalta hai)
export const retryRefund = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Refund not found' });

  const existing = await Refund.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Refund not found' });
  if (existing.status !== 'failed')
    return res.status(400).json({ message: 'Only a failed refund can be retried' });

  const refund = await initiateRefund(existing._id);
  if (!refund) return res.status(409).json({ message: 'Refund was just updated. Please refresh.' });

  await logAudit(req, 'REFUND_RETRIED', 'Refund', refund._id, { attempts: refund.attempts });
  res.json({ refund });
});