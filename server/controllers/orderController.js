import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';
import { STORE, calcTotals } from '../config/store.js';
import { paymentMode } from '../config/payment.js';
import { reserveStock, restoreStock } from '../utils/stock.js';

const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

const newOrderNo = () =>
  `MC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

// POST /api/orders   body: { address: {...}, paymentMethod: 'online' | 'cod' }
export const placeOrder = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  const a = req.body.address || {};

  if (!['online', 'cod'].includes(paymentMethod))
    return res.status(400).json({ message: 'paymentMethod must be online or cod' });

  const address = {
    name: String(a.name || '').trim(),
    phone: String(a.phone || '').trim(),
    line: String(a.line || '').trim(),
    city: String(a.city || '').trim(),
    state: String(a.state || '').trim(),
    pincode: String(a.pincode || '').trim(),
  };
  if (address.name.length < 2) return res.status(400).json({ message: 'Name is required' });
  if (!phoneRegex.test(address.phone)) return res.status(400).json({ message: 'Valid 10-digit phone is required' });
  if (address.line.length < 5) return res.status(400).json({ message: 'Please enter the full address' });
  if (!address.city || !address.state) return res.status(400).json({ message: 'City and state are required' });
  if (!pincodeRegex.test(address.pincode)) return res.status(400).json({ message: 'Valid 6-digit pincode is required' });

  if (paymentMethod === 'online' && paymentMode() !== 'mock')
    return res.status(503).json({ message: 'Online payment is not available yet. Please choose cash on delivery.' });

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  const items = (cart?.items || []).filter((i) => i.product);
  if (items.length === 0) return res.status(400).json({ message: 'Your cart is empty' });

  const bad = items.filter((i) => i.product.status !== 'approved' || i.product.stock < i.quantity);
  if (bad.length)
    return res.status(400).json({
      message: `Unavailable or low stock: ${bad.map((i) => i.product.name).join(', ')}. Please update your cart.`,
    });

  const rxItems = items.filter((i) => i.product.requiresPrescription);
  if (rxItems.length)
    return res.status(400).json({
      message: `${rxItems.map((i) => i.product.name).join(', ')} needs a valid prescription. Prescription upload is not available yet, so please remove these items to continue.`,
    });

  const lines = items.map((i) => ({
    product: i.product._id,
    name: i.product.name,
    price: i.product.price, // hamesha database ka price
    mrp: i.product.mrp,
    quantity: i.quantity,
    requiresPrescription: i.product.requiresPrescription,
    icon: i.product.icon,
  }));
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const totals = calcTotals(subtotal);

  // Stock atomic tarike se rokte hain
  const failed = await reserveStock(lines);
  if (failed)
    return res.status(409).json({ message: `Sorry, "${failed.name}" just went out of stock. Please update your cart.` });

  const online = paymentMethod === 'online';
  let order;
  try {
    order = await Order.create({
      orderNo: newOrderNo(),
      user: req.user._id,
      items: lines,
      address,
      ...totals,
      paymentMethod,
      status: online ? 'pending_payment' : 'placed',
      paymentStatus: online ? 'pending' : 'cod',
      holdExpiresAt: online ? new Date(Date.now() + STORE.orderHoldMinutes * 60 * 1000) : undefined,
      isDemo: items.every((i) => i.product.isDemo),
    });
  } catch (err) {
    await restoreStock(lines); // order na bana to stock wapas
    throw err;
  }

  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });

  res.status(201).json({
    message: online
      ? `Order created. Complete payment within ${STORE.orderHoldMinutes} minutes.`
      : 'Order placed. Pay cash on delivery.',
    order,
  });
});

// GET /api/orders/mine
export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ count: orders.length, orders });
});

// POST /api/orders/:id/mock-pay   body: { outcome: 'success' | 'failure' }
// SIRF development. Production mein paymentMode() 'off' hota hai.
export const mockPayOrder = asyncHandler(async (req, res) => {
  if (paymentMode() !== 'mock')
    return res.status(503).json({ message: 'Online payment is not available yet. Please choose cash on delivery.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });

  const { outcome } = req.body;
  if (!['success', 'failure'].includes(outcome))
    return res.status(400).json({ message: 'outcome must be success or failure' });

  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentMethod !== 'online')
    return res.status(400).json({ message: 'This order is not an online-payment order' });

  // Duplicate request
  if (order.paymentStatus === 'paid') return res.json({ message: 'Payment already completed', order });

  if (order.status !== 'pending_payment')
    return res.status(400).json({ message: `This order is ${order.status}, payment is not possible` });
  if (!order.holdExpiresAt || order.holdExpiresAt <= new Date())
    return res.status(400).json({ message: 'Payment time expired. Please place the order again.' });

  if (outcome === 'failure')
    return res.status(402).json({ message: 'Simulated payment failed. You can try again.' });

  const stamp = `${order._id}_${Date.now()}`;
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, user: req.user._id, status: 'pending_payment', holdExpiresAt: { $gt: new Date() } },
    {
      status: 'placed',
      paymentStatus: 'paid',
      payment: { provider: 'mock', providerPaymentId: `mock_pay_${stamp}`, paidAt: new Date(), isSimulated: true },
      $unset: { holdExpiresAt: 1 },
    },
    { new: true }
  );
  if (!paid) return res.status(409).json({ message: 'Payment time expired. Please place the order again.' });

  res.json({ message: 'Test payment successful. Order placed.', order: paid });
});

// PATCH /api/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Order not found' });

  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (!['pending_payment', 'placed', 'confirmed'].includes(order.status))
    return res.status(400).json({ message: `Cannot cancel an order that is ${order.status}` });
  if (order.paymentStatus === 'paid')
    return res.status(400).json({ message: 'Paid orders can be cancelled with refund only after Step 9 is built' });

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, user: req.user._id, status: order.status, paymentStatus: { $ne: 'paid' } },
    { status: 'cancelled', cancelledBy: 'patient', cancelledAt: new Date(), $unset: { holdExpiresAt: 1 } },
    { new: true }
  );
  if (!updated) return res.status(409).json({ message: 'Order was just updated. Please refresh.' });

  await restoreStock(updated.items); // sirf tab jab cancel sach mein hua
  res.json({ message: 'Order cancelled.', order: updated });
});