// import { useEffect, useState, useCallback } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { apiGet } from '../services/api';
// import useSocketEvent from '../hooks/useSocketEvent';
// import { AppIcon } from './Icon';

// export default function NotificationBell() {
//   const [unread, setUnread] = useState(0);
//   const { pathname } = useLocation();

//   const load = useCallback(
//     () => apiGet('/notifications').then((d) => setUnread(d.unread)).catch(() => {}),
//     []
//   );

//   useEffect(() => {
//     load();
//     const t = setInterval(load, 60000);
//     return () => clearInterval(t);
//   }, [pathname, load]);

//   useSocketEvent('notification:new', load);

//   return (
//     <Link to="/notifications" className="mc-toggler mc-bell" aria-label={`Notifications, ${unread} unread`}>
//       <AppIcon name="bell" size={20} />
//       {unread > 0 && <span className="mc-bell-badge">{unread > 9 ? '9+' : unread}</span>}
//     </Link>
//   );
// }

import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiGet } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';
import { AppIcon } from './Icon';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();

  const load = useCallback(
    () => apiGet('/notifications').then((d) => setUnread(d.unread)).catch(() => {}),
    []
  );

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [pathname, load]);

  // Notifications page se clear / read hone par badge turant update ho
  useEffect(() => {
    window.addEventListener('notifications:changed', load);
    return () => window.removeEventListener('notifications:changed', load);
  }, [load]);

  useSocketEvent('notification:new', load);

  return (
    <Link to="/notifications" className="mc-toggler mc-bell" aria-label={`Notifications, ${unread} unread`}>
      <AppIcon name="bell" size={20} />
      {unread > 0 && <span className="mc-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}