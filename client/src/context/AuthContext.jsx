import { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, getToken, setToken, clearToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiGet('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.status === 401) clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = (data) => {
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) =>
    startSession(await apiPost('/auth/login', { email, password }));

  const register = async (form) =>
    startSession(await apiPost('/auth/register', form));

  // Doctor registration: role 'doctor', status hamesha 'pending'
  const registerDoctor = async (form) =>
    startSession(await apiPost('/doctors/register', form));

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerDoctor, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);