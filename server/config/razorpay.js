import Razorpay from 'razorpay';

let instance = null;

export const getRazorpay = () => {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  if (!instance) instance = new Razorpay({ key_id: id, key_secret: secret });
  return instance;
};