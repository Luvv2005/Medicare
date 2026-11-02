// Backend ke productCategories.js jaisa hi rule
const OVERRIDES = {
  skincare: 'Skin Care',
  haircare: 'Hair Care',
  sanitary: 'Sanitary Products',
  'womens-health': "Women's Health",
  'mens-health': "Men's Health",
};

export const categoryName = (slug = '') =>
  OVERRIDES[slug] ||
  slug.split('-').filter(Boolean).map((w) => (w === 'and' ? '&' : w[0].toUpperCase() + w.slice(1))).join(' ');