import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { apiUpload } from '../utils/files';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import useSocketEvent from '../hooks/useSocketEvent';
import PageHeader from '../components/PageHeader';
import ProtectedFile from '../components/ProtectedFile';

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

function CallLine({ m }) {
  const mm = Math.floor(m.callDuration / 60);
  const ss = String(m.callDuration % 60).padStart(2, '0');
  return (
    <div className="mc-bubble-call">
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
  const [active, setActive] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
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

  return (
    <div className="container-xl py-4">
      <PageHeader title="Chat" subtitle={isPatient ? 'Message your doctors after a confirmed appointment.' : 'Message your patients.'} />
      {err && <div className="alert alert-danger py-2" role="alert">{err}</div>}

      <div className="mc-chat">
        <div className={`mc-chat-list ${active ? 'd-none d-md-flex' : ''}`}>
          {convs.length === 0 && (
            <p className="mc-muted p-3 mb-0">
              {isPatient ? 'No conversations yet. Open a doctor you have booked and press Chat.' : 'No conversations yet. Patients can message you after booking.'}
            </p>
          )}
          {convs.map((c) => (
            <button key={c._id} type="button" className={`mc-conv ${active === c._id ? 'active' : ''}`} onClick={() => setActive(c._id)}>
              <span>
                <strong>{c.otherName}</strong>
                <small>{c.lastMessage || c.subtitle}</small>
              </span>
              {c.unread > 0 && <span className="mc-unread">{c.unread}</span>}
            </button>
          ))}
        </div>

        <div className={`mc-chat-pane ${active ? '' : 'd-none d-md-flex'}`}>
          {!active ? (
            <p className="mc-muted p-3 mb-0">Select a conversation.</p>
          ) : (
            <>
              <div className="mc-chat-head">
                <button type="button" className="btn btn-link p-0 d-md-none" onClick={() => setActive('')}>← Back</button>
                <strong className="flex-fill">{cur?.otherName}</strong>
                <button type="button" className="btn btn-mc-outline btn-mc-sm" onClick={() => startCall({ conversationId: active, type: 'audio', peerName: cur?.otherName })}>📞 Voice</button>
                <button type="button" className="btn btn-mc-outline btn-mc-sm" onClick={() => startCall({ conversationId: active, type: 'video', peerName: cur?.otherName })}>🎥 Video</button>
              </div>

              <div className="mc-chat-body">
                {msgs.map((m) =>
                  m.kind === 'call' ? (
                    <CallLine key={m._id} m={m} />
                  ) : (
                    <div key={m._id} className={`mc-bubble ${m.sender === user._id ? 'me' : ''}`}>
                      {m.kind === 'file' && <ProtectedFile id={m.fileId} name={m.fileName} mime={m.fileMime} />}
                      {m.text && <div>{m.text}</div>}
                      <small>{time(m.createdAt)}</small>
                    </div>
                  )
                )}
                <div ref={endRef} />
              </div>

              <form className="mc-chat-form" onSubmit={send}>
                <label className="btn btn-mc-outline btn-mc-sm mb-0" title="Attach image or PDF">
                  📎
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
                </label>
                <input className="form-control" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={file ? `Attached: ${file.name}` : 'Type a message'} aria-label="Message" />
                <button className="btn btn-mc-primary" disabled={busy}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}