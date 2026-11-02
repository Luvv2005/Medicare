import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { demoProducts } from '../data/demoProducts.js';

if (process.env.NODE_ENV === 'production') {
  console.error('REFUSED: demo seed is disabled when NODE_ENV=production');
  process.exit(1);
}
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('REFUSED: set ALLOW_DEMO_SEED=true in server/.env (development only)');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name}`);

  // SIRF isDemo: true products. Real products ko nahi chhuta.
  const del = await Product.deleteMany({ isDemo: true });
  await Product.insertMany(
    demoProducts.map((p) => ({
      name: p.name,
      description: p.desc,
      category: p.category,
      brand: p.brand,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      requiresPrescription: p.rx,
      icon: p.icon,
      status: 'approved',
      isDemo: true,
    }))
  );
  console.log(`Removed ${del.deletedCount} old demo products, added ${demoProducts.length} new.`);
};

run()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());