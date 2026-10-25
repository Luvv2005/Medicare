import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api';
import { istToday } from '../utils/dates';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];

export default function AvailabilityEditor() {
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [sessions, setSessions] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [newOff, setNewOff] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGet('/doctors/me/availability')
      .then(({ availability: a }) => {
        setSlotMinutes(a.slotMinutes);
        setSessions(a.sessions || []);
        setDaysOff(a.daysOff || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (i, key, val) =>
    setSessions((list) => list.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
  const add = () =>
    setSessions((list) => [...list, { day: 1, start: '10:00', end: '13:00', mode: 'both' }]);
  const remove = (i) => setSessions((list) => list.filter((_, idx) => idx !== i));

  const addOff = () => {
    if (newOff && !daysOff.includes(newOff)) setDaysOff([...daysOff, newOff].sort());
    setNewOff('');
  };

  const save = async () => {
    setError('');
    setMsg('');
    setSaving(true);
    try {
      const res = await apiPut('/doctors/me/availability', {
        slotMinutes: Number(slotMinutes),
        sessions: sessions.map((s) => ({ ...s, day: Number(s.day) })),
        daysOff,
      });
      setSessions(res.availability.sessions);
      setMsg('Availability saved. New bookings will follow this schedule.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mc-muted">Loading...</p>;

  return (
    <div className="mc-card">
      <h5>Working hours</h5>
      <p className="mc-muted small">
        Patients see slots made from these sessions. Existing appointments are not changed.
      </p>

      <div className="mb-3" style={{ maxWidth: 220 }}>
        <label className="form-label small mb-1" htmlFor="slotmin">Slot length</label>
        <select id="slotmin" className="form-select" value={slotMinutes}
          onChange={(e) => setSlotMinutes(e.target.value)}>
          {SLOT_OPTIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      </div>

      {sessions.length === 0 && <p className="mc-muted">No sessions yet. Add one below.</p>}

      {sessions.map((s, i) => (
        <div className="row g-2 align-items-end mb-2" key={i}>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1">Day</label>
            <select className="form-select" value={s.day} onChange={(e) => update(i, 'day', e.target.value)}>
              {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
            </select>
          </div>
          <div className="col-3 col-md-2">
            <label className="form-label small mb-1">Start</label>
            <input type="time" className="form-control" value={s.start}
              onChange={(e) => update(i, 'start', e.target.value)} />
          </div>
          <div className="col-3 col-md-2">
            <label className="form-label small mb-1">End</label>
            <input type="time" className="form-control" value={s.end}
              onChange={(e) => update(i, 'end', e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1">Mode</label>
            <select className="form-select" value={s.mode} onChange={(e) => update(i, 'mode', e.target.value)}>
              <option value="both">Online + In-person</option>
              <option value="online">Online only</option>
              <option value="in-person">In-person only</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <button type="button" className="btn btn-mc-outline w-100" onClick={() => remove(i)}>Remove</button>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-mc-outline mt-2" onClick={add} disabled={sessions.length >= 30}>
        + Add session
      </button>

      <hr />
      <h6>Days off</h6>
      <div className="d-flex gap-2 mb-2" style={{ maxWidth: 360 }}>
        <input type="date" className="form-control" min={istToday()} value={newOff}
          onChange={(e) => setNewOff(e.target.value)} />
        <button type="button" className="btn btn-mc-outline" onClick={addOff}>Add</button>
      </div>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {daysOff.length === 0 && <span className="mc-muted small">No days off added.</span>}
        {daysOff.map((d) => (
          <span key={d} className="mc-chip">
            {d}{' '}
            <button type="button" className="btn btn-link p-0 ms-1"
              onClick={() => setDaysOff(daysOff.filter((x) => x !== d))} aria-label={`Remove ${d}`}>✕</button>
          </span>
        ))}
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}

      <button className="btn btn-mc-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save availability'}
      </button>
    </div>
  );
}