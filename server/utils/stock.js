import Product from '../models/Product.js';
import Order from '../models/Order.js';

export const restoreStock = async (lines) => {
  for (const l of lines) {
    await Product.updateOne({ _id: l.product }, { $inc: { stock: l.quantity } });
  }
};

// Har item ka stock atomic tarike se ghatata hai. Fail ho to pehle wale wapas karta hai.
// Fail hone wali line return karta hai, sab theek ho to null.
export const reserveStock = async (lines) => {
  const done = [];
  for (const l of lines) {
    const r = await Product.updateOne(
      { _id: l.product, status: 'approved', stock: { $gte: l.quantity } },
      { $inc: { stock: -l.quantity } }
    );
    if (r.modifiedCount !== 1) {
      await restoreStock(done);
      return l;
    }
    done.push(l);
  }
  return null;
};

// Unpaid online orders ko cancel karke stock wapas karta hai
export const releaseExpiredOrders = async () => {
  const expired = await Order.find({
    status: 'pending_payment',
    holdExpiresAt: { $lte: new Date() },
  }).select('_id');

  let count = 0;
  for (const { _id } of expired) {
    // Sirf pending_payment se cancel, taaki stock do baar wapas na ho
    const o = await Order.findOneAndUpdate(
      { _id, status: 'pending_payment' },
      { status: 'cancelled', paymentStatus: 'failed', cancelledBy: 'system', cancelledAt: new Date() },
      { new: true }
    );
    if (o) {
      await restoreStock(o.items);
      count++;
    }
  }
  return count;
};