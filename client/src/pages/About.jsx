import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const FEATURES = [
  { icon: '🩺', title: 'Doctor discovery', text: 'Search by name, specialization or city, filter by fee, experience and availability, see clinics on a map, and open a full profile with qualifications and reviews.' },
  { icon: '🗓️', title: 'Appointment booking', text: 'See real free slots, book online or in-person, reschedule, join a waiting list, and cancel with a clear refund policy.' },
  { icon: '🎟️', title: 'Live clinic queue', text: 'Check in at the clinic to get a token and follow your turn live, without refreshing.' },
  { icon: '💊', title: 'Medicine store', text: 'Medicines, vitamins, skincare and everyday healthcare products with a cart, checkout, prescription upload and order tracking.' },
  { icon: '↩️', title: 'Payments and refunds', text: 'Pay online or at the clinic. Refund status is visible from start to finish.' },
  { icon: '💬', title: 'Chat and consultations', text: 'Message your doctor, share images and documents, and join voice or video calls after a confirmed appointment.' },
  { icon: '🤖', title: 'Help assistant', text: 'Ask the assistant to find doctors, understand booking and refunds, or check your appointment, order and refund status.' },
  { icon: '👩‍⚕️', title: 'For doctors', text: 'Doctors manage their profile, working hours, sessions, queue and appointments from their own dashboard.' },
];

const SAFETY = [
  'Doctors appear publicly only after an administrator reviews their application.',
  'Passwords are stored as secure hashes and never shown to anyone.',
  'Access is role-based and enforced on the server: patients, doctors and admins see only what they are allowed to.',
  'Chat messages, prescriptions and doctor documents are private and are not publicly accessible.',
  'Your location is used only when you ask for nearby doctors and is not saved to your profile.',
  'Prescription medicines are sold only against a prescription that an administrator has verified.',
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
    </div>
  );
}