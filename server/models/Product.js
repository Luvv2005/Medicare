import mongoose from 'mongoose';
import { CATEGORY_SLUGS } from '../utils/productCategories.js';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, required: true, enum: CATEGORY_SLUGS },
    brand: { type: String, trim: true, maxlength: 60, default: '' },

    price: { type: Number, required: true, min: 0 }, // selling price
    mrp: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    requiresPrescription: { type: Boolean, default: false },

    icon: { type: String, default: '💊' }, // abhi emoji, baad mein real image
    image: { type: String, default: '' },

    // approved = public dikhta hai, hidden = chhupa hua
    status: { type: String, enum: ['approved', 'hidden'], default: 'approved' },

    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, category: 1 });

export default mongoose.model('Product', productSchema);