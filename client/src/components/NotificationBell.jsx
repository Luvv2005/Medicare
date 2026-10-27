import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiGet } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();

  const load = useCallback(
    () => apiGet('/notifications').then((d) => setUnread(d.unread)).catch(() => {}),
    []
  );

  // Page badalne par aur backup ke liye har 60 second. Asli update Socket.IO se turant aata hai.
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [pathname, load]);

  useSocketEvent('notification:new', load);

  return (
    <Link to="/notifications" className="mc-toggler mc-bell" aria-label={`Notifications, ${unread} unread`}>
      🔔
      {unread > 0 && <span className="mc-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}