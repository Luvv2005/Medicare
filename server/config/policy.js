// Cancellation rules ek hi jagah. DEMO policy hai, asli clinic policy final hone par yahan badlo.

// Appointment shuru hone se kitne ghante pehle cancel kiya, to kitna % refund
export const APPOINTMENT_REFUND_TIERS = [
  { minHoursBefore: 24, percent: 100 },
  { minHoursBefore: 2, percent: 50 },
  { minHoursBefore: 0, percent: 0 },
];

export const refundPercentFor = (hoursBefore) => {
  const tier = APPOINTMENT_REFUND_TIERS.find((t) => hoursBefore >= t.minHoursBefore);
  return tier ? tier.percent : 0;
};

// Medicine order: shipped hone se pehle cancel par poora refund
export const ORDER_REFUND_PERCENT = 100;

// Sirf simulated refund ke liye: itne second baad 'processed' ho jata hai
export const MOCK_REFUND_SETTLE_SECONDS = Number(process.env.MOCK_REFUND_SETTLE_SECONDS) || 60;