import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import useDebounce from '../hooks/useDebounce';
import DoctorCard from '../components/DoctorCard';

const EXPERIENCE = [
  { value: '', label: 'Any' },
  { value: '5', label: '5+ years' },
  { value: '10', label: '10+ years' },
  { value: '15', label: '15+ years' },
];
const FEES = [
  { value: '', label: 'Any' },
  { value: '0-500', label: '₹0 – 500' },
  { value: '500-1000', label: '₹500 – 1000' },
  { value: '1000+', label: '₹1000+' },
];
const MODES = [
  { value: '', label: 'All' },
  { value: 'online', label: 'Online consult' },
  { value: 'in-person', label: 'In-person visit' },
];

export default function FindDoctor() {
  const { theme } = useTheme();
  const [params, setParams] = useSearchParams();
  const get = (key) => params.get(key) || '';

  const [searchText, setSearchText] = useState(get('q'));
  const debounced = useDebounce(searchText, 400);

  const [specs, setSpecs] = useState([]);
  const [cities, setCities] = useState([]);
  const [data, setData] = useState({ doctors: [], total: 0, pages: 1, interpreted: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Location: sirf memory mein (URL mein nahi), user ke permission ke baad
  const [userLoc, setUserLoc] = useState(null);
  const [radius, setRadius] = useState('');
  const [locMsg, setLocMsg] = useState('');

  // URL ka ek param badlo. Filter badalne par page 1 par wapas.
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Dropdown data ek baar
  useEffect(() => {
    apiGet('/doctors/specializations').then((d) => setSpecs(d.specializations)).catch(() => {});
    apiGet('/doctors/cities').then((d) => setCities(d.cities)).catch(() => {});
  }, []);

  // Typing rukne ke baad search URL mein jaati hai
  useEffect(() => {
    if (debounced.trim() !== get('q')) setParam('q', debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // URL badalte hi doctors laao
  useEffect(() => {
    const qs = new URLSearchParams();
    ['q', 'specialization', 'city', 'mode', 'sort', 'minExp', 'page'].forEach((k) => {
      if (get(k)) qs.set(k, get(k));
    });
    const fee = get('fee');
    if (fee === '0-500') qs.set('maxFee', '500');
    if (fee === '500-1000') { qs.set('minFee', '500'); qs.set('maxFee', '1000'); }
    if (fee === '1000+') qs.set('minFee', '1000');
    if (userLoc && radius) {
      qs.set('lat', userLoc.lat);
      qs.set('lng', userLoc.lng);
      qs.set('radius', radius);
    }
    qs.set('limit', '10');

    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet(`/doctors?${qs.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, userLoc, radius]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setLocMsg('Location is not supported in this browser.');
    setLocMsg('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRadius((r) => r || '25');
        setLocMsg('');
        setParam('page', '');
      },
      () => setLocMsg('Location permission denied. You can still search by city.'),
      { timeout: 10000 }
    );
  };

  const stopLocation = () => {
    setUserLoc(null);
    setRadius('');
    setLocMsg('');
  };

  const clearAll = () => {
    setParams({}, { replace: true });
    setSearchText('');
    stopLocation();
  };

  const layout = theme === 'dark' ? 'grid' : 'list';
  const hasDemo = data.doctors.some((d) => d.isDemo);
  const page = Number(get('page')) || 1;
  const it = data.interpreted;

  const Radio = ({ name, options, current, onPick }) =>
    options.map((o) => (
      <div className="form-check mb-1" key={o.value || 'any'}>
        <input
          className="form-check-input"
          type="radio"
          name={name}
          id={`${name}-${o.value || 'any'}`}
          checked={current === o.value}
          onChange={() => onPick(o.value)}
        />
        <label className="form-check-label" htmlFor={`${name}-${o.value || 'any'}`}>
          {o.label}
        </label>
      </div>
    ));

  return (
    <div className="container-xl py-4">
      <h2 className="mb-1">Find a Doctor</h2>
      <p className="mc-muted">Search verified doctors by name, specialization or city.</p>

      {/* Search */}
      <form
        className="d-flex gap-2 mb-3"
        onSubmit={(e) => { e.preventDefault(); setParam('q', searchText.trim()); }}
      >
        <input
          className="form-control"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder='Try "skin specialist near Barnala"'
          aria-label="Search doctors"
        />
        <button className="btn btn-mc-primary" type="submit">Search</button>
      </form>

      {/* Specialization chips (swipe on mobile) */}
      <div className="mc-chips mb-3">
        <button
          className={`mc-chip-btn ${!get('specialization') ? 'active' : ''}`}
          onClick={() => setParam('specialization', '')}
        >
          All
        </button>
        {specs.map((s) => (
          <button
            key={s}
            className={`mc-chip-btn ${get('specialization') === s ? 'active' : ''}`}
            onClick={() => setParam('specialization', s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <button className="btn btn-mc-outline d-lg-none" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Hide filters' : 'Show filters'}
        </button>
        <div className="d-flex align-items-center gap-2 ms-auto">
          <label htmlFor="sort" className="mc-muted small mb-0">Sort</label>
          <select id="sort" className="form-select" style={{ width: 'auto' }}
            value={get('sort')} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="">Top rated</option>
            <option value="exp">Most experienced</option>
            <option value="fee_asc">Fee: low to high</option>
            <option value="fee_desc">Fee: high to low</option>
          </select>
        </div>
      </div>

      <div className="row g-4">
        {/* Filters */}
        <aside className={`col-lg-3 ${showFilters ? '' : 'd-none d-lg-block'}`}>
          <div className="mc-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Filters</h5>
              <button className="btn btn-link p-0" onClick={clearAll}>Clear All</button>
            </div>

            <div className="mc-filter-group">
              <h6>Mode of consult</h6>
              <Radio name="mode" options={MODES} current={get('mode')} onPick={(v) => setParam('mode', v)} />
            </div>

            <div className="mc-filter-group">
              <h6>Experience</h6>
              <Radio name="exp" options={EXPERIENCE} current={get('minExp')} onPick={(v) => setParam('minExp', v)} />
            </div>

            <div className="mc-filter-group">
              <h6>Fees</h6>
              <Radio name="fee" options={FEES} current={get('fee')} onPick={(v) => setParam('fee', v)} />
            </div>

            <div className="mc-filter-group">
              <h6>City</h6>
              <select className="form-select" value={get('city')} onChange={(e) => setParam('city', e.target.value)}>
                <option value="">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mc-filter-group">
              <h6>Distance</h6>
              {!userLoc ? (
                <button className="btn btn-mc-outline w-100" onClick={useMyLocation}>
                  📍 Use my location
                </button>
              ) : (
                <>
                  <select className="form-select mb-2" value={radius} onChange={(e) => setRadius(e.target.value)}>
                    {[5, 10, 25, 50, 100].map((km) => (
                      <option key={km} value={km}>Within {km} km</option>
                    ))}
                  </select>
                  <button className="btn btn-link p-0" onClick={stopLocation}>Turn off location</button>
                </>
              )}
              {locMsg && <div className="small mc-muted mt-2">{locMsg}</div>}
            </div>

            <p className="small mc-muted mb-0">
              Availability filter will arrive with appointment slots (Step 6).
            </p>
          </div>
        </aside>

        {/* Results */}
        <section className="col-lg-9">
          {it && (it.specialization || it.city) && (
            <div className="mc-note mb-3">
              Showing {it.specialization || 'doctors'}
              {it.city ? ` in ${it.city}` : ''} for “{get('q')}”
            </div>
          )}

          {hasDemo && (
            <div className="mc-note mc-note--warn mb-3">
              Some results are <strong>DEMO</strong> doctors with sample ratings. They will be replaced
              by verified doctors.
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {!error && (
            <p className="mc-muted mb-2">
              {loading ? 'Searching...' : `${data.total} doctor${data.total === 1 ? '' : 's'} found`}
            </p>
          )}

          {!loading && !error && data.doctors.length === 0 && (
            <div className="mc-card text-center">
              <h5>No doctors found</h5>
              <p className="mc-muted">Try a different spelling, another city, or clear the filters.</p>
              <button className="btn btn-mc-primary" onClick={clearAll}>Clear filters</button>
            </div>
          )}

          <div className={layout === 'grid' ? 'mc-doc-grid' : 'mc-doc-list'} style={{ opacity: loading ? 0.5 : 1 }}>
            {data.doctors.map((d) => (
              <DoctorCard key={d._id} doctor={d} layout={layout} userLoc={userLoc} />
            ))}
          </div>

          {data.pages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
              <button className="btn btn-mc-outline" disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}>
                ← Prev
              </button>
              <span className="mc-muted">Page {page} of {data.pages}</span>
              <button className="btn btn-mc-outline" disabled={page >= data.pages}
                onClick={() => setParam('page', String(page + 1))}>
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}