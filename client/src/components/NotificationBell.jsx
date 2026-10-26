import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiGet } from '../services/api';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();

  // Page badalne par aur har 30 second mein count refresh. Step 9B mein Socket.IO se live hoga.
  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet('/notifications')
        .then((d) => alive && setUnread(d.unread))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  return (
    <Link to="/notifications" className="mc-toggler mc-bell" aria-label={`Notifications, ${unread} unread`}>
      🔔
      {unread > 0 && <span className="mc-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}