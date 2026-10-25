// Hold expire ho chuka ho to screen par 'expired' dikhao (server sweep se pehle bhi)
export const effStatus = (a) =>
  a.status === 'held' && a.holdExpiresAt && new Date(a.holdExpiresAt) <= new Date()
    ? 'expired'
    : a.status;

export const STATUS_CHIP = {
  confirmed: 'mc-chip--ok',
  completed: 'mc-chip--ok',
  held: 'mc-chip--demo',
  cancelled: 'mc-chip--bad',
  expired: 'mc-chip--bad',
  no_show: 'mc-chip--bad',
};

export const statusLabel = (s) =>
  ({ held: 'Awaiting payment', no_show: 'No-show' }[s] || s.charAt(0).toUpperCase() + s.slice(1));

export const payLabel = (p) =>
  ({ paid: 'Paid', pending: 'Payment pending', pay_at_clinic: 'Pay at clinic', failed: 'Payment failed' }[p] || p);

export const refundLabel = (r) =>
  ({ pending: 'Refund pending', initiated: 'Refund initiated', processed: 'Refund processed', failed: 'Refund failed' }[r] || r);