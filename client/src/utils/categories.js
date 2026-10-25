export const CATEGORY_NAMES = {
  'pain-relief': 'Pain Relief',
  'cold-and-fever': 'Cold & Fever',
  digestive: 'Digestive Care',
  vitamins: 'Vitamins',
  supplements: 'Supplements',
  skincare: 'Skincare',
  haircare: 'Haircare',
  'personal-care': 'Personal Care',
  oils: 'Oils',
  sanitary: 'Sanitary Products',
};

export const categoryName = (slug) => CATEGORY_NAMES[slug] || slug;