import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { apiUpload } from '../utils/files';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import useSocketEvent from '../hooks/useSocketEvent';
import PageHeader from '../components/PageHeader';
import ProtectedFile from '../components/ProtectedFile';
import { initials, avatarColor } from '../utils/doctorUtils';

const EMOJIS = ['😊', '👍', '🙏', '❤️', '😷', '🤒', '💊', '✅'];

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const dayLabel = (d) => {
  const x = new Date(d);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (x.toDateString() === today.toDateString()) return 'Today';
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function Av({ name, small }) {
  return (
    <span className={`mc-cx-av ${small ? 'mc-cx-av--sm' : ''}`} style={{ background: avatarColor(name || '') }} aria-hidden="true">
      {initials(name || '?')}
    </span>
  );
}

function CallLine({ m }) {
  const mm = Math.floor(m.callDuration / 60);
  const ss = String(m.callDuration % 60).padStart(2, '0');
  return (
    <div className="mc-cx-call">
      {m.callType === 'video' ? '🎥' : '📞'} {m.callType === 'video' ? 'Video' : 'Voice'} call · {m.callStatus}
      {m.callStatus === 'completed' ? ` · ${mm}:${ss}` : ''} · {time(m.createdAt)}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [params] = useSearchParams();
  const doctorParam = params.get('doctor');
  const isPatient = user.role === 'patient';

  const [convs, setConvs] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [emoji, setEmoji] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const loadList = useCallback(
    () => apiGet('/chat/conversations').then((d) => setConvs(d.conversations)).catch((e) => setErr(e.message)),
    []
  );
  const loadMsgs = useCallback(
    (id) => apiGet(`/chat/${id}/messages`).then((d) => { setMsgs(d.messages); loadList(); }).catch((e) => setErr(e.message)),
    [loadList]
  );

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!doctorParam || !isPatient) return;
    apiPost('/chat/start', { doctorId: doctorParam })
      .then((d) => { setActive(d.conversation._id); loadList(); })
      .catch((e) => setErr(e.message));
  }, [doctorParam, isPatient, loadList]);

  useEffect(() => { if (active) loadMsgs(active); }, [active, loadMsgs]);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: 'end' }); }, [msgs]);

  useSocketEvent('chat:message', (p) => {
    loadList();
    if (p.conversationId === active) loadMsgs(active);
  });

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    setErr('');
    setEmoji(false);
    try {
      const fd = new FormData();
      fd.append('text', text);
      if (file) fd.append('file', file);
      await apiUpload(`/chat/${active}/messages`, fd);
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadMsgs(active);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  const cur = convs.find((c) => c._id === active);
  const shown = useMemo(
    () => convs.filter((c) => (c.otherName || '').toLowerCase().includes(search.trim().toLowerCase())),
    [convs, search]
  );

  // Din ke hisaab se alag alag dikhane ke liye
  const rows = [];
  let lastDay = '';
  msgs.forEach((m) => {
    const d = dayLabel(m.createdAt);
    if (d !== lastDay) {
      rows.push({ type: 'day', key: `d-${m._id}`, label: d });
      lastDay = d;
    }
    rows.push({ type: 'msg', key: m._id, m });
  });

  return (
    <div className="container-xl py-4">
      <PageHeader
        title="Chat"
        subtitle={isPatient ? 'Message your doctors after a confirmed appointment.' : 'Message your patients.'}
      />
      {err && <div className="alert alert-danger py-2" role="alert">{err}</div>}

      <div className="mc-cx">
        <div className={`mc-cx-side ${active ? 'd-none d-md-flex' : 'd-flex'}`}>
          <div className="mc-cx-sidehead">
            <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations" aria-label="Search conversations" />
          </div>
          <div className="mc-cx-list">
            {convs.length === 0 && (
              <p className="mc-muted p-3 mb-0">
                {isPatient
                  ? 'No conversations yet. Open a doctor you have booked and press Chat.'
                  : 'No conversations yet. Patients can message you after booking.'}
              </p>
            )}
            {convs.length > 0 && shown.length === 0 && <p className="mc-muted p-3 mb-0">No match.</p>}
            {shown.map((c) => (
              <button key={c._id} type="button" className={`mc-cx-item ${active === c._id ? 'active' : ''}`}
                onClick={() => setActive(c._id)}>
                <Av name={c.otherName} />
                <span className="meta">
                  <strong>{c.otherName}</strong>
                  <small>{c.lastMessage || c.subtitle}</small>
                </span>
                {c.unread > 0 && <span className="mc-unread">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={`mc-cx-main ${active ? 'd-flex' : 'd-none d-md-flex'}`}>
          {!active ? (
            <div className="mc-cx-empty">
              <div>
                <div className="big">💬</div>
                <h5>Your messages</h5>
                <p className="mb-0">Select a conversation to start chatting, sharing reports and calling.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mc-cx-head">
                <button type="button" className="btn btn-link p-0 d-md-none" onClick={() => setActive('')} aria-label="Back">←</button>
                <Av name={cur?.otherName} small />
                <div className="grow">
                  <strong className="d-block text-truncate">{cur?.otherName}</strong>
                  <small className="mc-muted">{cur?.subtitle}</small>
                </div>
                <button type="button" className="mc-cx-icon" title="Voice call" aria-label="Voice call"
                  onClick={() => startCall({ conversationId: active, type: 'audio', peerName: cur?.otherName })}>📞</button>
                <button type="button" className="mc-cx-icon" title="Video call" aria-label="Video call"
                  onClick={() => startCall({ conversationId: active, type: 'video', peerName: cur?.otherName })}>🎥</button>
              </div>

              <div className="mc-cx-body">
                {rows.length === 0 && <p className="mc-muted text-center mt-4">Say hello 👋</p>}
                {rows.map((r) => {
                  if (r.type === 'day') return <div key={r.key} className="mc-cx-day">{r.label}</div>;
                  const { m } = r;
                  if (m.kind === 'call') return <CallLine key={r.key} m={m} />;
                  return (
                    <div key={r.key} className={`mc-cx-msg ${m.sender === user._id ? 'me' : ''}`}>
                      {m.kind === 'file' && <ProtectedFile id={m.fileId} name={m.fileName} mime={m.fileMime} />}
                      {m.text && <div>{m.text}</div>}
                      <span className="mc-cx-time">{time(m.createdAt)}</span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form className="mc-cx-compose" onSubmit={send}>
                {emoji && (
                  <div className="mc-cx-emoji">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => setText((t) => t + e)}>{e}</button>
                    ))}
                  </div>
                )}
                <button type="button" className="mc-cx-icon" aria-label="Emoji" onClick={() => setEmoji(!emoji)}>😊</button>
                <label className="mc-cx-icon d-grid mb-0" title="Attach image or PDF" style={{ placeItems: 'center', cursor: 'pointer' }}>
                  📎
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setFile(e.target.files[0] || null)} />
                </label>
                <input className="form-control" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)}
                  placeholder={file ? `Attached: ${file.name}` : 'Type a message'} aria-label="Message" />
                <button className="mc-cx-send" disabled={busy} aria-label="Send">➤</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}