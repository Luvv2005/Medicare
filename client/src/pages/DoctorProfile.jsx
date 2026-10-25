import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import { FEATURES } from '../config/features';
import { initials, avatarColor, mapsUrl, directionsUrl } from '../utils/doctorUtils';
import BookingPanel from '../components/BookingPanel';

export default function DoctorProfile() {
  const { id } = useParams();
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
          {/* Header */}
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
        </div>

        {/* Booking side card */}
         <div className="col-lg-4">
          <BookingPanel doctor={d} />
          {FEATURES.chat && (
            <Link to="/chat" className="btn btn-mc-outline w-100 mt-3">Chat with doctor</Link>
          )}
        </div>
        <div className="col-lg-4">
          <div className="mc-card mc-sticky" id="book">
            <h5>Book appointment</h5>
            <div className="mc-doc-fee mb-2">₹{d.consultationFee}</div>
            <p className="mc-muted small">
              Consultation fee
              {d.payAtClinic && d.modes.inPerson ? ' · Pay at clinic available' : ''}
            </p>
            <button className="btn btn-mc-primary w-100 mb-2" disabled>
              Slots coming soon
            </button>
            <p className="small mc-muted mb-2">
              Appointment slots and payment are built in Step 6 and Step 7.
            </p>
            {FEATURES.chat && (
              <Link to="/chat" className="btn btn-mc-outline w-100">Chat with doctor</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}