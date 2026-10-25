import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import { STORE, calcTotals } from '../config/store.js';

const FIELDS = 'name price mrp icon image stock requiresPrescription category status isDemo';

// Cart ko frontend ke liye taiyar karta hai. Price hamesha database se.
const buildView = (cart) => {
  const items = [];
  let subtotal = 0;
  let count = 0;
  let hasPrescriptionItem = false;
  let hasIssues = false;

  for (const it of cart?.items || []) {
    const p = it.product;
    if (!p) continue; // product delete ho chuka
    const ok = p.status === 'approved' && p.stock >= it.quantity;
    if (!ok) hasIssues = true;
    if (p.requiresPrescription) hasPrescriptionItem = true;
    subtotal += p.price * it.quantity;
    count += it.quantity;
    items.push({
      product: {
        _id: p._id, name: p.name, price: p.price, mrp: p.mrp, icon: p.icon, image: p.image,
        stock: p.stock, requiresPrescription: p.requiresPrescription,
        category: p.category, isDemo: p.isDemo, status: p.status,
      },
      quantity: it.quantity,
      lineTotal: p.price * it.quantity,
      ok,
    });
  }

  return {
    items, count, hasPrescriptionItem, hasIssues,
    ...calcTotals(subtotal),
    freeDeliveryAbove: STORE.freeDeliveryAbove,
    maxQty: STORE.maxQtyPerItem,
  };
};

const sendCart = async (res, userId, status = 200) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product', FIELDS);
  res.status(status).json({ cart: buildView(cart) });
};

const parseQty = (v, fallback = 1) => {
  const n = Math.floor(Number(v ?? fallback));
  return Number.isFinite(n) ? n : NaN;
};

// GET /api/cart
export const getCart = asyncHandler(async (req, res) => sendCart(res, req.user._id));

// POST /api/cart/items   body: { productId, quantity }
export const addItem = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const quantity = parseQty(req.body.quantity, 1);
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Invalid product' });
  if (!(quantity >= 1 && quantity <= STORE.maxQtyPerItem))
    return res.status(400).json({ message: 'Invalid quantity' });

  const product = await Product.findOne({ _id: productId, status: 'approved' });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (product.stock < 1) return res.status(400).json({ message: 'This product is out of stock' });

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id, items: [] } },
    { upsert: true, new: true }
  );

  const existing = cart.items.find((i) => String(i.product) === String(product._id));
  const newQty = (existing?.quantity || 0) + quantity;
  const limit = Math.min(STORE.maxQtyPerItem, product.stock);
  if (newQty > limit)
    return res.status(400).json({ message: `You can add at most ${limit} of this item` });

  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: product._id, quantity });
  await cart.save();

  await sendCart(res, req.user._id);
});

// PATCH /api/cart/items/:productId   body: { quantity }
export const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const quantity = parseQty(req.body.quantity);
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Invalid product' });
  if (!(quantity >= 1)) return res.status(400).json({ message: 'Quantity must be at least 1' });

  const product = await Product.findOne({ _id: productId, status: 'approved' });
  if (!product) return res.status(400).json({ message: 'This product is no longer available' });

  const limit = Math.min(STORE.maxQtyPerItem, product.stock);
  if (quantity > limit) return res.status(400).json({ message: `You can add at most ${limit} of this item` });

  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find((i) => String(i.product) === String(productId));
  if (!item) return res.status(404).json({ message: 'Item not in cart' });

  item.quantity = quantity;
  await cart.save();
  await sendCart(res, req.user._id);
});

// DELETE /api/cart/items/:productId
export const removeItem = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId))
    return res.status(400).json({ message: 'Invalid product' });
  await Cart.updateOne(
    { user: req.user._id },
    { $pull: { items: { product: req.params.productId } } }
  );
  await sendCart(res, req.user._id);
});