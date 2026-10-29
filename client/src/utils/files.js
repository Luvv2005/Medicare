import { getToken } from '../services/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const auth = () => (getToken() ? { Authorization: `Bearer ${getToken()}` } : {});

// Multipart upload (file ke saath)
export async function apiUpload(path, form, method = 'POST') {
  const res = await fetch(`${API}${path}`, { method, headers: auth(), body: form });
  let data = null;
  try { data = await res.json(); } catch { /* no json */ }
  if (!res.ok) {
    const e = new Error(data?.message || `Upload failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}

export async function fetchBlob(path) {
  const res = await fetch(`${API}${path}`, { headers: auth() });
  if (!res.ok) throw new Error('Could not load the file');
  return res.blob();
}

// Private file ko naye tab mein kholta hai
export async function openProtected(path) {
  const w = window.open('', '_blank');
  try {
    const b = await fetchBlob(path);
    w.location.href = URL.createObjectURL(b);
  } catch (e) {
    if (w) w.close();
    alert(e.message);
  }
}

// "/api/files/ID" -> "/files/ID"
export const apiPathOf = (url) => url.replace(/^\/api/, '');