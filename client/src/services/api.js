const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'mc_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Saari requests yahin se jayengi. Token ho to automatically header mein lagta hai.
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response mein JSON nahi tha
  }

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  request(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: 'DELETE' });