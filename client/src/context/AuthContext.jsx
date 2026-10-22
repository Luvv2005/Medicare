import { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // app start par token check ho raha hai

  // Page load/refresh par: token hai to server se poochho "ye kaun hai?"
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiGet('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        // Sirf tab token hatao jab server bole token galat/expired hai
        if (err.status === 401) clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (form) => {
    const data = await apiPost('/auth/register', form);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);