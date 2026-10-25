import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import { useAuth } from './AuthContext';

const EMPTY = {
  items: [], count: 0, subtotal: 0, deliveryFee: 0, total: 0,
  hasPrescriptionItem: false, hasIssues: false, freeDeliveryAbove: 499, maxQty: 10,
};

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'patient') {
      setCart(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet('/cart');
      setCart(data.cart);
    } catch {
      setCart(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async (promise) => {
    const data = await promise;
    setCart(data.cart);
    return data.cart;
  };

  const addToCart = (productId, quantity = 1) => run(apiPost('/cart/items', { productId, quantity }));
  const setQty = (productId, quantity) => run(apiPatch(`/cart/items/${productId}`, { quantity }));
  const removeItem = (productId) => run(apiDelete(`/cart/items/${productId}`));

  return (
    <CartContext.Provider value={{ cart, count: cart.count, loading, refresh, addToCart, setQty, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);