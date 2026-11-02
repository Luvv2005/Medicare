import { useRef, useState } from 'react';

// Swipe (drag) se badalta hai. Tap aur keyboard (arrow keys) bhi chalte hain.
export default function SwipeToggle({ value, onChange, options, label }) {
  const track = useRef(null);
  const drag = useRef(null);
  const [offset, setOffset] = useState(null);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  const half = () => (track.current ? track.current.clientWidth / 2 : 0);
  const choose = (i) => {
    if (i !== idx) onChange(options[i].value);
  };

  const down = (e) => {
    const h = half();
    drag.current = { x: e.clientX, start: idx * h, moved: false, h };
    track.current.setPointerCapture(e.pointerId);
    setOffset(idx * h);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    setOffset(Math.min(d.h, Math.max(0, d.start + dx)));
  };
  const up = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    let next;
    if (d.moved) {
      next = Math.min(d.h, Math.max(0, d.start + (e.clientX - d.x))) > d.h / 2 ? 1 : 0;
    } else {
      next = e.clientX - track.current.getBoundingClientRect().left > d.h ? 1 : 0;
    }
    setOffset(null);
    choose(next);
  };
  const cancel = () => {
    drag.current = null;
    setOffset(null);
  };
  const key = (e) => {
    if (e.key === 'ArrowLeft') choose(0);
    else if (e.key === 'ArrowRight') choose(1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(idx === 0 ? 1 : 0);
    }
  };

  const visual = offset !== null ? (offset > half() / 2 ? 1 : 0) : idx;

  return (
    <div
      ref={track}
      className={`mc-sw ${offset !== null ? 'moving' : ''}`}
      role="switch"
      aria-checked={idx === 1}
      aria-label={label}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onKeyDown={key}
    >
      <span
        className={`mc-sw-thumb ${offset !== null ? 'drag' : ''}`}
        style={{ transform: offset !== null ? `translateX(${offset}px)` : `translateX(${idx * 100}%)` }}
      >
        <span className="mc-sw-pill" />
      </span>
      {options.map((o, i) => (
        <span key={o.value} className={`mc-sw-label ${visual === i ? 'on' : ''}`}>{o.label}</span>
      ))}
    </div>
  );
}