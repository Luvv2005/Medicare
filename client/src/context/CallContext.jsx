import { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import CallModal from '../components/CallModal';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const socket = useSocket();
  const [call, setCall] = useState(null);

  // Kisi bhi page par incoming call aaye to modal khul jaye
  useEffect(() => {
    if (!socket) return undefined;
    const onIncoming = (p) =>
      setCall((cur) => cur || { conversationId: p.conversationId, type: p.type, peerName: p.from?.name || 'Caller', role: 'callee' });
    socket.on('call:incoming', onIncoming);
    return () => socket.off('call:incoming', onIncoming);
  }, [socket]);

  const startCall = (c) => {
    if (!socket) return;
    setCall((cur) => cur || { ...c, role: 'caller' });
  };

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      {call && socket && (
        <CallModal key={call.conversationId} call={call} socket={socket} onClose={() => setCall(null)} />
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);