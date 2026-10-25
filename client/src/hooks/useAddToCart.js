import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function useAddToCart() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const add = async (product, qty = 1) => {
    if (!user) return navigate('/login', { state: { from: location } });
    if (user.role !== 'patient') return setMsg('Only patient accounts can shop.');
    setBusyId(product._id);
    try {
      await addToCart(product._id, qty);
      setMsg(`${product.name} added to cart`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId('');
    }
    return undefined;
  };

  return { add, busyId, msg };
}