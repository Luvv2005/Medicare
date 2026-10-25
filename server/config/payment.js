// 'mock' = sirf development ka nakli payment. Production mein hamesha 'off'.
// Last step mein yahan 'razorpay' mode aayega.
export const paymentMode = () => {
  if (process.env.NODE_ENV === 'production') return 'off';
  return process.env.PAYMENT_MODE === 'mock' ? 'mock' : 'off';
};