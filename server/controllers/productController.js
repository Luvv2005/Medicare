import mongoose from 'mongoose';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import { PRODUCT_CATEGORIES, CATEGORY_SLUGS } from '../utils/productCategories.js';

const isNum = (v) => v !== undefined && v !== '' && Number.isFinite(Number(v));

const SORTS = {
  name: { name: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
};

// GET /api/products/categories
export const getCategories = asyncHandler(async (req, res) => {
  const counts = await Product.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({ categories: PRODUCT_CATEGORIES.map((c) => ({ ...c, count: map[c.slug] || 0 })) });
});

// GET /api/products?q&category&sort&minPrice&maxPrice&rx&inStock&page&limit
export const listProducts = asyncHandler(async (req, res) => {
  const { q, category, sort, minPrice, maxPrice, rx, inStock } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48);

  const filter = { status: 'approved' };
  if (category && CATEGORY_SLUGS.includes(category)) filter.category = category;
  if (q && String(q).trim()) {
    const rxp = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: rxp }, { brand: rxp }, { description: rxp }];
  }
  const price = {};
  if (isNum(minPrice)) price.$gte = Number(minPrice);
  if (isNum(maxPrice)) price.$lte = Number(maxPrice);
  if (Object.keys(price).length) filter.price = price;
  if (rx === 'yes') filter.requiresPrescription = true;
  if (rx === 'no') filter.requiresPrescription = false;
  if (inStock === 'true') filter.stock = { $gt: 0 };

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .select('-__v')
      .sort(SORTS[sort] || SORTS.name)
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({ total, page, pages: Math.ceil(total / limit), products });
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Product not found' });
  const product = await Product.findOne({ _id: req.params.id, status: 'approved' }).select('-__v');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});