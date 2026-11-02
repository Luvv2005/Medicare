import { ROWS } from '../data/catalog.js';

// Jin slugs ka naam seedha slug se nahi banta
const OVERRIDES = {
  skincare: 'Skin Care',
  haircare: 'Hair Care',
  sanitary: 'Sanitary Products',
  'womens-health': "Women's Health",
  'mens-health': "Men's Health",
};

export const nameOf = (slug) =>
  OVERRIDES[slug] ||
  slug.split('-').map((w) => (w === 'and' ? '&' : w[0].toUpperCase() + w.slice(1))).join(' ');

export const PRODUCT_CATEGORIES = ROWS.map((r) => ({ slug: r[0], icon: r[1], name: nameOf(r[0]) }));

export const CATEGORY_SLUGS = PRODUCT_CATEGORIES.map((c) => c.slug);