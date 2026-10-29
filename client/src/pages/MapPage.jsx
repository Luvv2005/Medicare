import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import PageHeader from '../components/PageHeader';
import MapView from '../components/MapView';
import { hasCoords, distanceKm } from '../utils/doctorUtils';

export default function MapPage() {
  const [doctors, setDoctors] = useState([]);
  const [loc, setLoc] = useState(null);
  const [radius, setRadius] = useState('25');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = new URLSearchParams({ limit: '50' });
    if (loc) { qs.set('lat', loc.lat); qs.set('lng', loc.lng); qs.set('radius', radius); }
    setLoading(true);
    apiGet(`/doctors?${qs}`).then((d) => setDoctors(d.doctors)).catch((e) => setMsg(e.message)).finally(() => setLoading(false));
  }, [loc, radius]);

  const points = useMemo(() => {
    const p = doctors.filter((d) => hasCoords(d.clinic)).map((d) => ({
      lat: d.clinic.location.coordinates[1], lng: d.clinic.location.coordinates[0],
      title: d.name, sub: `${d.specialization} · ${d.clinic.name}`, href: `/doctors/${d._id}`,
    }));
    return loc ? [...p, { lat: loc.lat, lng: loc.lng, title: 'You are here' }] : p;
  }, [doctors, loc]);

  const locate = () => {
    if (!navigator.geolocation) return setMsg('Location is not supported in this browser.');
    setMsg('Getting your location...');
    return navigator.geolocation.getCurrentPosition(
      (pos) => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setMsg(''); },
      () => setMsg('Location permission denied. You can still browse the map.'),
      { timeout: 10000 }
    );
  };

  const missing = doctors.filter((d) => !hasCoords(d.clinic));

  return (
    <div className="container-xl py-4">
      <PageHeader title="Doctors on the map" subtitle="Approved doctors and their clinic locations." />
      <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
        {!loc ? (
          <button className="btn btn-mc-outline" onClick={locate}>📍 Show doctors near me</button>
        ) : (
          <>
            <select className="form-select" style={{ width: 'auto' }} value={radius} onChange={(e) => setRadius(e.target.value)} aria-label="Distance">
              {[5, 10, 25, 50, 100].map((k) => <option key={k} value={k}>Within {k} km</option>)}
            </select>
            <button className="btn btn-link" onClick={() => setLoc(null)}>Turn off location</button>
          </>
        )}
      </div>
      {msg && <div className="mc-note mb-3 text-center">{msg}</div>}

      <MapView points={points} height={420} />

      <h5 className="mt-4">{loading ? 'Loading...' : `${doctors.length} doctor${doctors.length === 1 ? '' : 's'}`}</h5>
      <div className="mc-doc-grid">
        {doctors.map((d) => (
          <Link key={d._id} to={`/doctors/${d._id}`} className="mc-cat text-start align-items-start">
            <strong>{d.name} {d.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}</strong>
            <span className="mc-muted small">{d.specialization} · {d.clinic.city}</span>
            {loc && hasCoords(d.clinic) && <span className="small">{distanceKm(loc, d.clinic.location.coordinates).toFixed(1)} km away</span>}
          </Link>
        ))}
      </div>
      {missing.length > 0 && (
        <p className="small mc-muted mt-3">{missing.length} doctor(s) have not set a map location yet, so they are not shown as pins.</p>
      )}
    </div>
  );
}