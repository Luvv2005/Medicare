import { ROWS } from './catalog.js';
import { nameOf } from '../utils/productCategories.js';

const MULT = [0.5, 0.75, 1, 1.4, 1.9];
const BRANDS = ['CarePlus', 'MediPure', 'HealthFirst', 'VitaLife', 'PureCure'];
const FACTORS = [1.1, 1.15, 1.2, 1.25];
const STOCKS = [120, 80, 45, 200, 60, 35, 150, 90];
const r5 = (n) => Math.max(15, Math.round(n / 5) * 5);

let n = 0;
export const demoProducts = ROWS.flatMap(([slug, icon, base, ...names]) =>
  names.map((raw, k) => {
    const i = n++;
    const rx = raw.endsWith('*');
    const name = raw.replace(/\*$/, '');
    const price = r5(base * MULT[k]);
    let stock = STOCKS[i % STOCKS.length];
    if (i % 97 === 18) stock = 0;
    if (i % 89 === 6) stock = 3;
    return {
      name,
      desc: `${name}. ${nameOf(slug)} product. Read the label and use as directed.`,
      category: slug,
      brand: BRANDS[i % BRANDS.length],
      price,
      mrp: Math.ceil(price * FACTORS[i % FACTORS.length]),
      stock,
      rx,
      icon,
    };
  })
);