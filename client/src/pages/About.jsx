import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const FEATURES = [
  { icon: '🩺', title: 'Doctor discovery', text: 'Search by name, specialization or city, filter by fee, experience and availability, and open a full profile with qualifications and clinic details.' },
  { icon: '🗓️', title: 'Appointment booking', text: 'See real free slots, book online or in-person, and cancel with a clear refund policy.' },
  { icon: '💊', title: 'Medicine store', text: 'Medicines, vitamins, skincare and everyday healthcare products with a cart, checkout and order tracking.' },
  { icon: '↩️', title: 'Payments and refunds', text: 'Pay online or at the clinic. Refund status is visible from start to finish.' },
  { icon: '🔔', title: 'Notifications', text: 'Updates for bookings, cancellations, orders and refunds in one place.' },
  { icon: '👩‍⚕️', title: 'For doctors', text: 'Doctors manage their profile, working hours, sessions and appointments from their own dashboard.' },
];

const SOON = [
  'Live queue and token numbers',
  'Patient and doctor chat',
  'Voice and video consultations',
  'Maps view of nearby clinics',
  'AI help assistant',
  'Prescription upload for prescription medicines',
];

const SAFETY = [
  'Doctors appear publicly only after an administrator reviews their application.',
  'Passwords are stored as secure hashes and never shown to anyone.',
  'Access is role-based and enforced on the server: patients, doctors and admins see only what they are allowed to.',
  'Your location is used only when you ask for nearby doctors and is not saved to your profile.',
  'Prescription medicines cannot be ordered until prescription verification is available.',
];

export default function About() {
  return (
    <div className="container-xl py-4">
      <PageHeader
        title="About MediCare"
        subtitle="One place to find a trusted doctor, book a visit and order your medicines."
      />

      <section className="mc-block pt-0">
        <div className="mc-card text-center mc-legal">
          <h5>Our purpose</h5>
          <p className="mb-0">
            Finding the right doctor and getting medicines should not take phone calls and queues.
            MediCare brings verified doctors, appointment booking and a healthcare store together,
            so you can see what is available, book in a few taps and track everything afterwards.
          </p>
        </div>
      </section>

      <section className="mc-block">
        <div className="mc-sec-head"><h3>What you can do</h3></div>
        <div className="mc-cat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="mc-card text-center">
              <div className="mc-cat-icon">{f.icon}</div>
              <h6 className="mt-2">{f.title}</h6>
              <p className="mc-muted small mb-0">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mc-block">
        <div className="mc-sec-head"><h3>Privacy and safety</h3></div>
        <div className="mc-card mc-legal">
          <ul className="mb-2">
            {SAFETY.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="small mc-muted mb-0">
            Read our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link>.
            MediCare does not diagnose conditions or replace a qualified doctor. In an emergency, call 112.
          </p>
        </div>
      </section>

      <section className="mc-block">
        <div className="mc-sec-head"><h3>Coming soon</h3></div>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          {SOON.map((s) => <span key={s} className="mc-chip">{s}</span>)}
        </div>
        <p className="text-center small mc-muted mt-3 mb-0">
          Online payments are currently in test mode while we prepare for live payments.
        </p>
      </section>
    </div>
  );
}