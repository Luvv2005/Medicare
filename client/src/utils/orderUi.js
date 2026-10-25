// Online order ka payment time nikal gaya ho to 'expired' dikhao
export const effOrderStatus = (o) =>
  o.status === 'pending_payment' && o.holdExpiresAt && new Date(o.holdExpiresAt) <= new Date()
    ? 'expired'
    : o.status;

export const ORDER_LABEL = {
  pending_payment: 'Awaiting payment',
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const ORDER_CHIP = {
  placed: 'mc-chip--ok',
  confirmed: 'mc-chip--ok',
  shipped: 'mc-chip--ok',
  delivered: 'mc-chip--ok',
  pending_payment: 'mc-chip--demo',
  cancelled: 'mc-chip--bad',
  expired: 'mc-chip--bad',
};

export const orderPayLabel = (o) =>
  ({ paid: 'Paid', pending: 'Payment pending', cod: 'Cash on delivery', failed: 'Not paid' }[o.paymentStatus] || o.paymentStatus);

export const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;