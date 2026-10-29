import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PayModal from './PayModal';
import { next14, formatDay, formatDate, formatTime } from '../utils/dates';

const phoneRegex = /^[6-9]\d{9}$/;

export default function BookingPanel({ doctor }) {
  const { user } = useAuth();
  const location = useLocation();

  const [days] = useState(next14);
  const [date, setDate] = useState(days[0]);
  const [mode, setMode] = useState(doctor.modes.online ? 'online' : 'in-person');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState('');

  const [payChoice, setPayChoice] = useState('online');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [reason, setReason] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [payAppt, setPayAppt] = useState(null);
  const [held, setHeld] = useState(null);
  const [done, setDone] = useState(null);

  const clinicOk = mode === 'in-person' && doctor.payAtClinic;
  const method = payChoice === 'clinic' && clinicOk ? 'clinic' : 'online';

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSlotError('');
    setSelected('');
    setInfo('');
    apiGet(`/doctors/${doctor._id}/slots?date=${date}&mode=${mode}`)
      .then((res) => !cancelled && setSlots(res.slots))
      .catch((err) => {
        if (!cancelled) {
          setSlots([]);
          setSlotError(err.message);
        }
      })
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => { cancelled = true; };
  }, [doctor._id, date, mode, reloadKey]);

  const validatePatient = () => {
    if (name.trim().length < 2) return 'Please enter patient name';
    if (!phoneRegex.test(phone.trim())) return 'Enter a valid 10-digit phone number';
    return '';
  };

  const book = async () => {
    setError('');
    if (!selected) return setError('Please choose a time slot');
    const v = validatePatient();
    if (v) return setError(v);

    setBusy(true);
    try {
      const res = await apiPost('/appointments', {
        doctorId: doctor._id,
        date,
        startTime: selected,
        mode,
        paymentMethod: method,
        patientName: name.trim(),
        patientPhone: phone.trim(),
        reason: reason.trim(),
      });
      if (method === 'online') setPayAppt(res.appointment);
      else setDone(res.appointment);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const joinWaitlist = async () => {
    setError('');
    setInfo('');
    const v = validatePatient();
    if (v) return setError(v);
    setBusy(true);
    try {
      const res = await apiPost('/waitlist', {
        doctorId: doctor._id,
        date,
        mode,
        patientName: name.trim(),
        patientPhone: phone.trim(),
        reason: reason.trim(),
      });
      setInfo(res.message);
    } catch (err) {
      setError(err.message);
      if (err.status === 400) setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const onPaid = (appointment) => {
    setPayAppt(null);
    setHeld(null);
    setDone(appointment);
  };

  const onPayClose = () => {
    setHeld(payAppt);
    setPayAppt(null);
    setError('Payment was not completed. Your slot is held for 10 minutes. You can retry below.');
    setReloadKey((k) => k + 1);
  };

  if (done) {
    return (
      <div className="mc-card mc-sticky" id="book">
        <h5>✅ Appointment {done.status}</h5>
        <p className="mb-1"><strong>{formatDate(done.date)}</strong> at <strong>{formatTime(done.startTime)}</strong></p>
        <p className="mc-muted mb-2 text-capitalize">{done.mode} consultation</p>
        {done.paymentStatus === 'paid' && <p className="mb-2">₹{done.amount} paid online.</p>}
        {done.paymentStatus === 'pay_at_clinic' && <p className="mb-2">Please pay ₹{done.amount} at the clinic.</p>}
        <Link to="/dashboard" className="btn btn-mc-primary w-100">View my appointments</Link>
      </div>
    );
  }

  const isPatient = user?.role === 'patient';
  const allTaken = !loadingSlots && !slotError && slots.length > 0 && slots.every((s) => !s.available);

  return (
    <div className="mc-card mc-sticky" id="book">
      {payAppt && <PayModal appointment={payAppt} onClose={onPayClose} onPaid={onPaid} />}

      <h5>Book appointment</h5>
      <div className="mc-doc-fee mb-1">₹{doctor.consultationFee}</div>
      <p className="mc-muted small">Consultation fee</p>

      {doctor.modes.online && doctor.modes.inPerson && (
        <div className="d-flex gap-2 mb-3">
          <button type="button" className={`mc-chip-btn flex-fill ${mode === 'online' ? 'active' : ''}`}
            onClick={() => setMode('online')}>Online</button>
          <button type="button" className={`mc-chip-btn flex-fill ${mode === 'in-person' ? 'active' : ''}`}
            onClick={() => setMode('in-person')}>In-person</button>
        </div>
      )}

      <div className="mc-days mb-3">
        {days.map((d) => (
          <button key={d} type="button" className={`mc-day ${date === d ? 'active' : ''}`}
            onClick={() => setDate(d)}>
            {formatDay(d)}
          </button>
        ))}
      </div>

      {loadingSlots && <p className="mc-muted small">Loading slots...</p>}
      {slotError && <div className="alert alert-danger py-2">{slotError}</div>}
      {!loadingSlots && !slotError && slots.length === 0 && (
        <p className="mc-muted small">No slots available on this date.</p>
      )}
      <div className="mc-slot-grid mb-3">
        {slots.map((s) => (
          <button key={s.startTime} type="button" disabled={!s.available}
            className={`mc-slot ${selected === s.startTime ? 'active' : ''}`}
            onClick={() => setSelected(s.startTime)}>
            {formatTime(s.startTime)}
          </button>
        ))}
      </div>

      {allTaken && isPatient && (
        <div className="mc-note mb-3">
          <div className="mb-2">All slots on this day are taken. If someone cancels, we can offer you a slot.</div>
          <button className="btn btn-mc-outline btn-mc-sm" onClick={joinWaitlist} disabled={busy}>
            Join the waiting list
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {info && <div className="alert alert-success py-2" role="status">{info}</div>}

      {held && (
        <div className="mb-3">
          <button className="btn btn-mc-primary w-100" onClick={() => setPayAppt(held)}>
            Pay ₹{held.amount} now
          </button>
        </div>
      )}

      {!held && !user && (
        <Link to="/login" state={{ from: location }} className="btn btn-mc-primary w-100">
          Login to book
        </Link>
      )}

      {!held && user && !isPatient && (
        <p className="mc-muted small mb-0">Only patient accounts can book appointments.</p>
      )}

      {!held && isPatient && (
        <>
          <div className="mb-2">
            <label className="form-label small mb-1" htmlFor="pname">Patient name</label>
            <input id="pname" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-1" htmlFor="pphone">Phone</label>
            <input id="pphone" className="form-control" type="tel" inputMode="numeric" maxLength={10}
              value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
          </div>
          <div className="mb-3">
            <label className="form-label small mb-1" htmlFor="preason">
              Reason <span className="mc-muted">(optional)</span>
            </label>
            <input id="preason" className="form-control" maxLength={300}
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input className="form-check-input" type="radio" id="pay-online" checked={method === 'online'}
                onChange={() => setPayChoice('online')} />
              <label className="form-check-label" htmlFor="pay-online">Pay online (UPI, card, netbanking)</label>
            </div>
            {clinicOk && (
              <div className="form-check">
                <input className="form-check-input" type="radio" id="pay-clinic" checked={method === 'clinic'}
                  onChange={() => setPayChoice('clinic')} />
                <label className="form-check-label" htmlFor="pay-clinic">Pay at clinic</label>
              </div>
            )}
          </div>

          {mode === 'in-person' && (
            <p className="small mc-muted">
              Clinic: {doctor.clinic.name}, {doctor.clinic.address}, {doctor.clinic.city}
            </p>
          )}

          <button className="btn btn-mc-primary w-100" onClick={book} disabled={busy || !selected}>
            {busy
              ? 'Please wait...'
              : method === 'online'
                ? `Book and pay ₹${doctor.consultationFee}`
                : 'Confirm booking (pay at clinic)'}
          </button>
        </>
      )}
    </div>
  );
}