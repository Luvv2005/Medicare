import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPatch } from '../services/api';

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/notifications');
      setItems(d.notifications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.read) {
      try {
        await apiPatch(`/notifications/${n._id}/read`);
      } catch {
        // koi baat nahi
      }
    }
    if (n.link) navigate(n.link);
    else load();
  };

  const markAll = async () => {
    await apiPatch('/notifications/read-all');
    load();
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="container-xl py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="mb-0">Notifications</h2>
        {hasUnread && (
          <button className="btn btn-mc-outline btn-mc-sm" onClick={markAll}>Mark all as read</button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="mc-muted">Loading...</p>}
      {!loading && !error && items.length === 0 && (
        <div className="mc-card"><p className="mc-muted mb-0">No notifications yet.</p></div>
      )}

      {items.map((n) => (
        <button
          type="button"
          key={n._id}
          className={`mc-notif ${n.read ? '' : 'mc-notif--unread'}`}
          onClick={() => open(n)}
        >
          <strong>{n.title}</strong>
          <span>{n.message}</span>
          <small className="mc-muted">{new Date(n.createdAt).toLocaleString('en-IN')}</small>
        </button>
      ))}
    </div>
  );
}