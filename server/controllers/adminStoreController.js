import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import { logAudit } from '../utils/audit.js';
import { restoreStock } from '../utils/stock.js';
import { CATEGORY_SLUGS } from '../utils/productCategories.js';
import { notify } from '../utils/notify.js';
import { startRefund } from '../utils/refunds.js';
import { ORDER_REFUND_PERCENT } from '../config/policy.js';

// Body se sirf safe fields. isDemo kabhi body se nahi aata.
const cleanProduct = (b, isUpdate = false) => {
  const out = {};
  const need = (k) => !isUpdate || b[k] !== undefined;

  if (need('name')) {
    const n = String(b.name || '').trim();
    if (n.length < 2 || n.length > 120) return { error: 'Name must be 2 to 120 characters' };
    out.name = n;
  }
  if (need('category')) {
    if (!CATEGORY_SLUGS.includes(b.category)) return { error: 'Choose a valid category' };
    out.category = b.category;
  }
  for (const k of ['price', 'mrp']) {
    if (need(k)) {
      const v = Number(b[k]);
      if (b[k] === '' || !Number.isFinite(v) || v < 0 || v > 1000000) return { error: `${k.toUpperCase()} is invalid` };
      out[k] = v;
    }
  }
  if (need('stock')) {
    const v = Number(b.stock);
    if (b.stock === '' || !Number.isInteger(v) || v < 0 || v > 100000) return { error: 'Stock must be a whole number' };
    out.stock = v;
  }
  if (b.description !== undefined) out.description = String(b.description).slice(0, 1000);
  if (b.brand !== undefined) out.brand = String(b.brand).trim().slice(0, 60);
  if (b.icon !== undefined) out.icon = String(b.icon).trim().slice(0, 8) || '💊';
  if (b.requiresPrescription !== undefined) out.requiresPrescription = Boolean(b.requiresPrescription);
  if (b.status !== undefined) {
    if (!['approved', 'hidden'].includes(b.status)) return { error: 'Invalid status' };
    out.status = b.status;
  }
  return { data: out };
};

// GET /api/admin/products?q=
export const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.name = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ count: products.length, products });
});

// POST /api/admin/products
export const createProduct = asyncHandler(async (req, res) => {
  const { data, error } = cleanProduct(req.body);
  if (error) return res.status(400).json({ message: error });
  if (data.price > data.mrp) return res.status(400).json({ message: 'Price cannot be more than MRP' });

  const product = await Product.create({ ...data, isDemo: false });
  await logAudit(req, 'PRODUCT_CREATED', 'Product', product._id, { name: product.name });
  res.status(201).json({ product });
});

// PUT /api/admin/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const { data, error } = cleanProduct(req.body, true);
  if (error) return res.status(400).json({ message: error });
  if ((data.price ?? product.price) > (data.mrp ?? product.mrp))
    return res.status(400).json({ message: 'Price cannot be more than MRP' });

  Object.assign(product, data);
  await product.save();
  await logAudit(req, 'PRODUCT_UPDATED', 'Product', product._id, { fields: Object.keys(data) });
  res.json({ product });
});

// GET /api/admin/orders
export const listOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ count: orders.length, orders });
});

const NEXT = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
};

// PATCH /api/admin/orders/:id/status   body: { status }
export const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const { status } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!(NEXT[order.status] || []).includes(status)) {
    return res.status(400).json({
      message: `Cannot change order from ${order.status} to ${status}`,
    });
  }

  const update = { status };

  if (status === 'delivered' && order.paymentMethod === 'cod') {
    update.paymentStatus = 'paid';
  }

  if (status === 'cancelled') {
    update.cancelledBy = 'admin';
    update.cancelledAt = new Date();
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    update,
    { new: true }
  );

  if (!updated) {
    return res.status(409).json({
      message: 'Order was just changed. Please refresh.',
    });
  }

  let refund = null;

  if (status === 'cancelled') {
    await restoreStock(updated.items);

    if (order.paymentStatus === 'paid') {
      refund = await startRefund({
        sourceType: 'order',
        source: updated,
        amount: Math.round(
          (updated.total * ORDER_REFUND_PERCENT) / 100
        ),
        reason: 'Order cancelled by admin',
        providerPaymentId: updated.payment?.providerPaymentId,
      });
    }
  }

  await logAudit(
    req,
    'ORDER_STATUS_CHANGED',
    'Order',
    updated._id,
    {
      from: order.status,
      to: status,
    }
  );

  await notify(updated.user, {
    type: 'order',
    title: `Order ${updated.orderNo} ${status}`,
    message: `Your order ${updated.orderNo} is now ${status}.${
      refund
        ? ` A refund of ₹${refund.amount} has been initiated.`
        : ''
    }`,
    link: '/orders',
  });

  res.json({
    order: await Order.findById(updated._id),
  });
});