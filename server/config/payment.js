// 'razorpay' = asli gateway (keys ke saath), 'mock' = sirf development, 'off' = online payment band.
export const paymentMode = () => {
  const m = process.env.PAYMENT_MODE;
  if (m === 'razorpay' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return 'razorpay';
  if (process.env.NODE_ENV === 'production') return 'off';
  return m === 'mock' ? 'mock' : 'off';
};