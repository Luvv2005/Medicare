import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FEATURES } from '../config/features';
import BookingPanel from '../components/BookingPanel';
import ReviewSection from '../components/ReviewSection';
import MapView from '../components/MapView';
import { initials, avatarColor, mapsUrl, directionsUrl, hasCoords } from '../utils/doctorUtils';

export default function DoctorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet(`/doctors/${id}`)
      .then((d) => setDoctor(d.doctor))
      .catch((err) => setError(err.status === 404 ? 'Doctor not found' : err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const points = useMemo(
    () =>
      doctor && hasCoords(doctor.clinic)
        ? [{ lat: doctor.clinic.location.coordinates[1], lng: doctor.clinic.location.coordinates[0], title: doctor.clinic.name, sub: doctor.clinic.address }]
        : [],
    [doctor]
  );

  if (loading) return <div className="container py-5 text-center mc-muted">Loading...</div>;

  if (error)
    return (
      <div className="container py-5 text-center">
        <h4>{error}</h4>
        <Link to="/find-doctor" className="btn btn-mc-primary mt-2">Back to doctors</Link>
      </div>
    );

  const d = doctor;
  const hasRating = d.rating?.count > 0;

  return (
    <div className="container-xl py-4">
      <Link to="/find-doctor" className="mc-muted d-inline-block mb-3">← Back to doctors</Link>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="mc-card mb-3">
            <div className="d-flex gap-3 flex-wrap">
              {d.profilePhoto ? (
                <img className="mc-avatar mc-avatar--lg" src={d.profilePhoto} alt={d.name} />
              ) : (
                <div className="mc-avatar mc-avatar--lg" style={{ background: avatarColor(d.name) }}>
                  {initials(d.name)}
                </div>
              )}
              <div>
                <h3 className="mb-1">{d.name}</h3>
                <div className="mc-doc-spec">{d.specialization}</div>
                <div className="mc-doc-meta mb-2">
                  {d.experienceYears} years experience
                  {hasRating && (
                    <> · ★ {d.rating.value.toFixed(1)}{' '}
                      <small className="mc-muted">({d.rating.count} ratings{d.rating.isDemo ? ', demo' : ''})</small>
                    </>
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <span className="mc-chip mc-chip--ok">✓ Verified by MediCare</span>
                  {d.modes.online && <span className="mc-chip">Online</span>}
                  {d.modes.inPerson && <span className="mc-chip">In-person</span>}
                  {d.isDemo && <span className="mc-chip mc-chip--demo">DEMO PROFILE</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mc-card mb-3">
            <h5>About</h5>
            <p className="mb-0">{d.bio || 'No description added yet.'}</p>
          </div>

          <div className="mc-card mb-3">
            <h5>Qualifications and registration</h5>
            <p className="mb-1"><strong>Qualifications:</strong> {d.qualifications.join(', ')}</p>
            <p className="mb-1"><strong>Registration no.:</strong> {d.registrationNumber}</p>
            <p className="mb-1"><strong>Council:</strong> {d.registrationCouncil}</p>
            {d.languages?.length > 0 && (
              <p className="mb-0"><strong>Languages:</strong> {d.languages.join(', ')}</p>
            )}
          </div>

          <div className="mc-card">
            <h5>Clinic</h5>
            <p className="mb-1"><strong>{d.clinic.name}</strong></p>
            <p className="mc-muted">
              {d.clinic.address}, {d.clinic.city}, {d.clinic.state} - {d.clinic.pincode}
            </p>
            {points.length > 0 && <div className="mb-3"><MapView points={points} height={240} /></div>}
            {d.modes.inPerson ? (
              <div className="mc-doc-actions">
                <a className="btn btn-mc-outline btn-mc-sm" href={mapsUrl(d.clinic)} target="_blank" rel="noopener noreferrer">Open in Maps</a>
                <a className="btn btn-mc-outline btn-mc-sm" href={directionsUrl(d.clinic, 'driving')} target="_blank" rel="noopener noreferrer">🚗 Drive</a>
                <a className="btn btn-mc-outline btn-mc-sm" href={directionsUrl(d.clinic, 'walking')} target="_blank" rel="noopener noreferrer">🚶 Walk</a>
              </div>
            ) : (
              <p className="mc-muted mb-0">This doctor offers online consultations only.</p>
            )}
          </div>

          <ReviewSection doctorId={d._id} />
        </div>

        <div className="col-lg-4">
          <BookingPanel doctor={d} />
          {FEATURES.chat && user?.role === 'patient' && (
            <Link to={`/chat?doctor=${d._id}`} className="btn btn-mc-outline w-100 mt-3">
              Chat with doctor
            </Link>
          )}
          {FEATURES.chat && user?.role === 'patient' && (
            <p className="small mc-muted mt-1">Chat and calls open after you have a confirmed appointment.</p>
          )}
        </div>
      </div>
    </div>
  );
}