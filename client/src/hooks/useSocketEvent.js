import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

export default function useSocketEvent(event, handler) {
  const socket = useSocket();
  const ref = useRef(handler);

  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => ref.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}