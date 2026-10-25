// Store ke rules ek hi jagah. Baad mein badalna ho to sirf yahan.
export const STORE = {
  freeDeliveryAbove: 499, // rupees
  deliveryFee: 40,
  maxQtyPerItem: 10,
  orderHoldMinutes: 15, // online-pay order kitni der stock rokta hai
};

export const calcTotals = (subtotal) => {
  const deliveryFee = subtotal === 0 || subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
};