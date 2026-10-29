import { Link } from 'react-router-dom';
import { FEATURES } from '../config/features';
import {
  initials, avatarColor, hasCoords, distanceKm, mapsUrl, directionsUrl,
} from '../utils/doctorUtils';

// layout: 'grid' (dark) ya 'list' (light, Apollo jaisa)
export default function DoctorCard({ doctor: d, layout = 'grid', userLoc }) {
  const profile = `/doctors/${d._id}`;
  const km =
    userLoc && hasCoords(d.clinic) ? distanceKm(userLoc, d.clinic.location.coordinates) : null;
  const hasRating = d.rating?.count > 0;

  return (
    <article className={`mc-doc-card mc-doc-card--${layout}`}>
      <div className="mc-doc-main">
        {d.profilePhoto ? (
          <img className="mc-avatar" src={d.profilePhoto} alt={d.name} />
        ) : (
          <div className="mc-avatar" style={{ background: avatarColor(d.name) }} aria-hidden="true">
            {initials(d.name)}
          </div>
        )}

        <div className="mc-doc-info">
          <h5 className="mb-1">{d.name}</h5>
          <div className="mc-doc-spec">{d.specialization}</div>
          <div className="mc-doc-meta">
            {d.experienceYears} yrs
            {hasRating && (
              <>
                {' · '}★ {d.rating.value.toFixed(1)}
                <small className="mc-muted"> ({d.rating.count}{d.rating.isDemo ? ', demo' : ''})</small>
              </>
            )}
          </div>
          {d.qualifications?.length > 0 && (
            <div className="mc-doc-quals">{d.qualifications.join(', ')}</div>
          )}
          <div className="mc-muted small mt-1">
            {d.clinic.name}
            <br />
            {d.clinic.address}, {d.clinic.city}, {d.clinic.state}
            {km !== null && <strong> · {km.toFixed(1)} km away</strong>}
          </div>
        </div>
      </div>

      <div className="mc-doc-side">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
          <span className="mc-doc-fee">₹{d.consultationFee}</span>
          {d.modes.online && <span className="mc-chip">Online</span>}
          {d.modes.inPerson && <span className="mc-chip">In-person</span>}
          <span className="mc-chip mc-chip--ok">✓ Verified</span>
          {d.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
        </div>

        <div className="mc-doc-actions">
          <Link to={profile} className="btn btn-mc-outline btn-mc-sm">View Profile</Link>
          <Link to={profile} className="btn btn-mc-primary btn-mc-sm">Book Appointment</Link>
        </div>

        <div className="mc-doc-actions">
          {d.modes.inPerson && (
            <>
              <a className="btn btn-mc-outline btn-mc-sm" href={mapsUrl(d.clinic)} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
              <a className="btn btn-mc-outline btn-mc-sm" href={directionsUrl(d.clinic, 'driving')} target="_blank" rel="noopener noreferrer">
                🚗 Drive
              </a>
              <a className="btn btn-mc-outline btn-mc-sm" href={directionsUrl(d.clinic, 'walking')} target="_blank" rel="noopener noreferrer">
                🚶 Walk
              </a>
            </>
          )}
          {FEATURES.chat && (
            <Link to={`/chat?doctor=${d._id}`} className="btn btn-mc-outline btn-mc-sm">Chat</Link>
          )}
        </div>
      </div>
    </article>
  );
}