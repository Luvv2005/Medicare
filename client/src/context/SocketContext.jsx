import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket } from '../services/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const uid = user?._id;
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!uid) {
      setSocket(null);
      return undefined;
    }
    const s = connectSocket();
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [uid]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);