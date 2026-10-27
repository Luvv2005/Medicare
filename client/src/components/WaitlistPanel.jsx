import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';
import PayModal from './PayModal';
import { formatDate, formatTime } from '../utils/dates';

export default function WaitlistPanel({ onChanged }) {
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [payAppt, setPayAppt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(
    () => apiGet('/waitlist/mine').then((d) => setEntries(d.entries)).catch(() => {}),
    []
  );

  useEffect(() => { load(); }, [load]);
  useSocketEvent('waitlist:update', () => { load(); onChanged(); });

  // Countdown
  const hasOffer = entries.some((e) => e.status === 'offered');
  useEffect(() => {
    if (!hasOffer) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasOffer]);

  const run = async (id, fn) => {
    setMsg('');
    setBusyId(id);
    try {
      return await fn();
    } catch (err) {
      setMsg(err.message);
      return null;
    } finally {
      setBusyId('');
      load();
      onChanged();
    }
  };

  const accept = async (e, method) => {
    const r = await run(e._id, () => apiPost(`/waitlist/${e._id}/accept`, { paymentMethod: method }));
    if (!r) return;
    setMsg(r.message);
    if (r.needsPayment) setPayAppt(r.appointment);
  };

  const leave = (e) => run(e._id, async () => {
    const r = await apiDelete(`/waitlist/${e._id}`);
    setMsg(r.message);
  });

  if (entries.length === 0 && !msg) return null;

  return (
    <div className="mc-card mb-3">
      {payAppt && (
        <PayModal
          appointment={payAppt}
          onClose={() => { setPayAppt(null); setMsg('Payment pending. Pay from Upcoming below within 10 minutes.'); onChanged(); }}
          onPaid={() => { setPayAppt(null); setMsg('Test payment successful. Appointment confirmed.'); onChanged(); }}
        />
      )}
      <h5>Waiting list</h5>
      {msg && <div className="alert alert-info py-2">{msg}</div>}

      {entries.map((e) => {
        const left = e.offer?.expiresAt ? Math.max(0, Math.floor((new Date(e.offer.expiresAt) - now) / 1000)) : 0;
        const expired = e.status === 'offered' && left === 0;
        const mm = String(Math.floor(left / 60)).padStart(2, '0');
        const ss = String(left % 60).padStart(2, '0');

        return (
          <div key={e._id} className={e.status === 'offered' ? 'mc-offer' : 'mc-appt'}>
            <strong>{e.doctor.name}</strong>
            <span className="mc-muted"> · {e.doctor.specialization}</span>
            <div className="small">{formatDate(e.date)} · <span className="text-capitalize">{e.mode}</span></div>

            {e.status === 'waiting' && (
              <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                <span className="mc-chip">On the waiting list</span>
                <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === e._id} onClick={() => leave(e)}>
                  Leave list
                </button>
              </div>
            )}

            {e.status === 'offered' && (
              <>
                <div className="mt-1">
                  A slot opened at <strong>{formatTime(e.offer.startTime)}</strong>.{' '}
                  {expired ? (
                    <span className="mc-bad">Offer expired.</span>
                  ) : (
                    <span className="mc-warn">Accept within {mm}:{ss}</span>
                  )}
                </div>
                {!expired && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button className="btn btn-mc-primary btn-mc-sm" disabled={busyId === e._id}
                      onClick={() => accept(e, 'online')}>
                      Accept and pay online
                    </button>
                    {e.mode === 'in-person' && e.doctor.payAtClinic && (
                      <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === e._id}
                        onClick={() => accept(e, 'clinic')}>
                        Accept, pay at clinic
                      </button>
                    )}
                    <button className="btn btn-link" disabled={busyId === e._id} onClick={() => leave(e)}>
                      Decline
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}