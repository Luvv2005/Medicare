import { io } from 'socket.io-client';
import { getToken } from './api';

// VITE_API_URL = http://localhost:5000/api  ->  socket ka URL = http://localhost:5000
const URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const connectSocket = () => io(URL, { auth: { token: getToken() } });