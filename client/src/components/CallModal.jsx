import { useEffect, useRef, useState } from 'react';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const END_TEXT = {
  completed: 'Call ended', declined: 'Call declined', missed: 'No answer', unavailable: 'User is not available right now',
};

export default function CallModal({ call, socket, onClose }) {
  const { conversationId: cid, type, role, peerName } = call;
  const [status, setStatus] = useState(role === 'caller' ? 'Calling...' : 'Incoming call');
  const [ringing, setRinging] = useState(role === 'callee');
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);

  const pc = useRef(null);
  const stream = useRef(null);
  const localEl = useRef(null);
  const remoteEl = useRef(null);
  const queued = useRef([]);
  const done = useRef(false);
  const started = useRef(false);

  const emit = (ev, extra = {}) => socket.emit(ev, { conversationId: cid, ...extra });

  const finish = (text) => {
    if (done.current) return;
    done.current = true;
    if (pc.current) pc.current.close();
    if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    setConnected(false);
    setRinging(false);
    setStatus(text);
    setTimeout(onClose, 1500);
  };

  const getMedia = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      if (localEl.current) localEl.current.srcObject = stream.current;
      return true;
    } catch {
      return false;
    }
  };

  const makePc = () => {
    const p = new RTCPeerConnection(ICE);
    pc.current = p;
    stream.current.getTracks().forEach((t) => p.addTrack(t, stream.current));
    p.onicecandidate = (e) => e.candidate && emit('call:signal', { data: { candidate: e.candidate } });
    p.ontrack = (e) => { if (remoteEl.current) remoteEl.current.srcObject = e.streams[0]; };
    p.onconnectionstatechange = () => {
      if (p.connectionState === 'connected') { setConnected(true); setStatus('Connected'); }
      if (p.connectionState === 'failed') { emit('call:end'); finish('Connection failed'); }
    };
    return p;
  };

  useEffect(() => {
    const flush = async () => {
      for (const c of queued.current.splice(0)) await pc.current.addIceCandidate(c).catch(() => {});
    };
    const onSignal = async (p) => {
      if (p.conversationId !== cid || !pc.current) return;
      const d = p.data;
      try {
        if (d.sdp) {
          await pc.current.setRemoteDescription(d.sdp);
          await flush();
          if (d.sdp.type === 'offer') {
            const ans = await pc.current.createAnswer();
            await pc.current.setLocalDescription(ans);
            emit('call:signal', { data: { sdp: pc.current.localDescription } });
          }
        } else if (d.candidate) {
          if (pc.current.remoteDescription) await pc.current.addIceCandidate(d.candidate).catch(() => {});
          else queued.current.push(d.candidate);
        }
      } catch { /* ignore */ }
    };
    const onAccepted = async (p) => {
      if (p.conversationId !== cid) return;
      setStatus('Connecting...');
      const c = makePc();
      const offer = await c.createOffer();
      await c.setLocalDescription(offer);
      emit('call:signal', { data: { sdp: c.localDescription } });
    };
    const onEnded = (p) => { if (p.conversationId === cid) finish(END_TEXT[p.status] || 'Call ended'); };
    const onBusy = (p) => { if (p.conversationId === cid) finish('User is busy on another call'); };

    socket.on('call:signal', onSignal);
    socket.on('call:accepted', onAccepted);
    socket.on('call:ended', onEnded);
    socket.on('call:busy', onBusy);

    if (role === 'caller' && !started.current) {
      started.current = true;
      (async () => {
        if (!(await getMedia())) return finish('Microphone or camera permission is needed');
        return emit('call:invite', { type });
      })();
    }
    return () => {
      socket.off('call:signal', onSignal);
      socket.off('call:accepted', onAccepted);
      socket.off('call:ended', onEnded);
      socket.off('call:busy', onBusy);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connected) return undefined;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const accept = async () => {
    if (!(await getMedia())) {
      emit('call:decline');
      return finish('Microphone or camera permission is needed');
    }
    makePc();
    setRinging(false);
    setStatus('Connecting...');
    return emit('call:accept');
  };
  const decline = () => { emit('call:decline'); finish('Call declined'); };
  const hangUp = () => { emit('call:end'); finish('Call ended'); };

  const toggleMic = () => {
    stream.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };
  const toggleCam = () => {
    stream.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff(!camOff);
  };

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label="Call">
      <div className="mc-call mc-card">
        <h5 className="mb-0">{peerName}</h5>
        <div className="mc-muted mb-2">{connected ? `${mm}:${ss}` : `${type === 'video' ? 'Video' : 'Voice'} call · ${status}`}</div>

        <video ref={remoteEl} autoPlay playsInline className={type === 'video' ? 'mc-remote' : 'mc-hidden-media'} />
        {type === 'video' && <video ref={localEl} autoPlay playsInline muted className="mc-local" />}
        {type === 'audio' && <div className="mc-call-avatar">🎧</div>}

        <div className="mc-call-ctl">
          {ringing ? (
            <>
              <button className="btn btn-mc-success" onClick={accept}>Accept</button>
              <button className="btn btn-mc-outline" onClick={decline}>Decline</button>
            </>
          ) : (
            <>
              <button className="btn btn-mc-outline" onClick={toggleMic}>{muted ? 'Unmute' : 'Mute'}</button>
              {type === 'video' && (
                <button className="btn btn-mc-outline" onClick={toggleCam}>{camOff ? 'Camera on' : 'Camera off'}</button>
              )}
              <button className="btn btn-mc-primary" onClick={hangUp}>End call</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}