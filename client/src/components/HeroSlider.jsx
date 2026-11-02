import { useEffect, useState } from 'react';

const SRC = ['/hero-doctor.jpg', '/hero-2.jpg', '/hero-3.jpg', '/hero-4.jpg', '/hero-5.jpg'];
const EVERY = 20000; // 20 second

export default function HeroSlider() {
  const [bad, setBad] = useState([]);
  const [i, setI] = useState(0);
  const good = SRC.filter((s) => !bad.includes(s));
  const active = good.length ? i % good.length : 0;

  useEffect(() => {
    if (good.length < 2) return undefined;
    const t = setInterval(() => setI((x) => x + 1), EVERY);
    return () => clearInterval(t);
  }, [good.length, i]);

  return (
    <div className="mc-hero2">
      {good.length === 0 && <span className="mc-hero2-fallback" aria-hidden="true">🩺</span>}
      {good.map((src, n) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`mc-slide ${n === active ? 'on' : ''}`}
          onError={() => setBad((b) => (b.includes(src) ? b : [...b, src]))}
        />
      ))}
      {good.length > 1 && (
        <div className="mc-dots">
          {good.map((src, n) => (
            <button key={src} type="button" className={n === active ? 'on' : ''}
              aria-label={`Show picture ${n + 1}`} onClick={() => setI(n)} />
          ))}
        </div>
      )}
    </div>
  );
}