import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../services/api';
import { usePrefs } from '../context/PrefsContext';

const HI = 'Hi! I can help you find doctors, understand booking and refunds, browse medicines, or check your appointment, order and refund status. I cannot give medical advice.';
const CHIPS = ['Find a skin specialist near Barnala', 'How do I cancel and get a refund?', 'My appointment status', 'Delivery charges'];

export default function AssistantWidget() {
  const { prefs } = usePrefs();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: 'bot', reply: HI }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' });
  }, [msgs, open]);

  const send = async (value) => {
    const m = (value ?? text).trim();
    if (!m || busy) return;
    setText('');
    setMsgs((x) => [...x, { from: 'me', reply: m }]);
    setBusy(true);
    try {
      const r = await apiPost('/assistant', { message: m, lang: prefs.lang });
      setMsgs((x) => [...x, { from: 'bot', ...r }]);
    } catch (e) {
      setMsgs((x) => [...x, { from: 'bot', reply: e.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="mc-ai-btn" aria-label="Open help assistant" onClick={() => setOpen(!open)}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="mc-ai" role="dialog" aria-label="Help assistant">
          <div className="mc-chat-head"><strong>MediCare assistant</strong></div>
          <div className="mc-ai-body">
            {msgs.map((m, i) => (
              <div key={i} className={`mc-ai-msg ${m.from === 'me' ? 'me' : ''}`}>
                {m.reply}
                {(m.doctors || []).map((d) => (
                  <Link key={d._id} to={`/doctors/${d._id}`} onClick={() => setOpen(false)}>
                    {d.name} · {d.specialization} · {d.city} · ₹{d.fee}
                    {d.availableThisWeek ? ' · slots this week' : ' · no free slots this week'}
                    {d.isDemo ? ' (demo)' : ''}
                  </Link>
                ))}
                {(m.products || []).map((p) => (
                  <Link key={p._id} to={`/medicines/${p._id}`} onClick={() => setOpen(false)}>
                    {p.name} · ₹{p.price}{p.rx ? ' · Rx' : ''}{p.inStock ? '' : ' · out of stock'}
                  </Link>
                ))}
                {(m.links || []).map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label} →</Link>
                ))}
              </div>
            ))}
            {busy && <div className="mc-ai-msg">Thinking...</div>}
            {msgs.length === 1 && (
              <div className="d-flex flex-wrap gap-1">
                {CHIPS.map((c) => (
                  <button key={c} type="button" className="mc-chip-btn" style={{ minHeight: 34, fontSize: '0.8rem' }} onClick={() => send(c)}>{c}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form className="mc-chat-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="form-control" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Ask something..." aria-label="Message" />
            <button className="btn btn-mc-primary" type="submit" disabled={busy}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}