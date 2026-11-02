import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconBadge } from '../components/Icon';

const FEATURES = [
  {
    icon: 'stethoscope', title: 'Doctor discovery', short: 'Search, filter and see clinics on a map.',
    more: [
      'Search by name, specialization or city, even with spelling mistakes.',
      'Find specialists or local village clinic doctors near you.',
      'Open a profile with qualifications, registration, clinic map and patient reviews.',
      'Only doctors approved by an administrator are listed.',
    ],
  },
  {
    icon: 'calendar', title: 'Appointments', short: 'Book real slots and follow your turn live.',
    more: [
      'See real free slots and book online or at the clinic.',
      'Reschedule up to 2 times, or join a waiting list when a day is full.',
      'Check in at the clinic to get a token and watch your turn live.',
      'A clear cancellation policy shows your refund before you confirm.',
    ],
  },
  {
    icon: 'pill', title: 'Medicine store', short: 'Medicines and healthcare, delivered.',
    more: [
      'Medicines, vitamins, skincare and everyday healthcare products.',
      'Cart, checkout, cash on delivery or online payment.',
      'Prescription medicines need a prescription verified by an administrator.',
      'Track every order and cancel until it ships.',
    ],
  },
  {
    icon: 'refund', title: 'Payments and refunds', short: 'Pay your way and see every refund.',
    more: [
      'Pay online, or at the clinic where the doctor allows it.',
      'Refunds start right away; when they reach you depends on your bank.',
      'If a doctor cancels, an online payment is refunded in full.',
      'Payment history shows every payment and refund status.',
    ],
  },
  {
    icon: 'chat', title: 'Chat and consultations', short: 'Talk to your doctor after booking.',
    more: [
      'Message your doctor and share images or PDF reports.',
      'Join voice or video calls from the chat.',
      'Chats and files are private to you and your doctor.',
      'Call history appears in the conversation.',
    ],
  },
  {
    icon: 'bot', title: 'Help and alerts', short: 'An assistant and timely updates.',
    more: [
      'Ask the assistant to find doctors or explain booking and refunds.',
      'Check your appointment, order and refund status after logging in.',
      'Get in-app notifications for bookings, cancellations, orders and refunds.',
      'The assistant never gives medical advice. In an emergency, call 112.',
    ],
  },
];

const SAFETY = [
  { icon: 'shield', title: 'Verified doctors', text: 'Doctors appear only after an administrator reviews their application.' },
  { icon: 'key', title: 'Protected passwords', text: 'Passwords are stored as secure hashes and never shown to anyone.' },
  { icon: 'puzzle', title: 'Role-based access', text: 'Patients, doctors and admins see only what they are allowed to, enforced on the server.' },
  { icon: 'lock', title: 'Private chats and files', text: 'Messages, prescriptions and doctor documents are not publicly accessible.' },
  { icon: 'pin', title: 'Location only when asked', text: 'Your location is used for nearby doctors only and is not saved to your profile.' },
  { icon: 'clipboard', title: 'Verified prescriptions', text: 'Prescription medicines are sold only against a prescription an admin has verified.' },
];

function InfoModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label={item.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mc-modal mc-modal--info mc-card mc-about-modal">
        <div className="text-center mb-2">
          <IconBadge name={item.icon} size={30} />
          <h4 className="mt-2">{item.title}</h4>
        </div>
        <ul>{item.more.map((m) => <li key={m}>{m}</li>)}</ul>
        <button className="btn btn-mc-primary w-100" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function About() {
  const [open, setOpen] = useState(null);

  return (
    <div className="container-xl py-4">
      <PageHeader title="About MediCare" />

     <section className="mc-block" style={{ paddingTop: '2rem' }}>
        <div className="mc-card mc-hov text-center mc-legal">
          <h3 className="mb-2">One place to find a trusted doctor, book a visit and order your medicines.</h3>
          <p className="mc-muted mb-0">
            Finding the right doctor and getting medicines should not take phone calls and queues.
            MediCare brings verified doctors, appointment booking and a healthcare store together, so
            you can see what is available, book in a few taps and track everything afterwards.
          </p>
        </div>
      </section>

      <section className="mc-sec2">
        <div className="mc-sec2-head"><h3>What you can do</h3><span className="mc-muted small">Tap a card to know more</span></div>
        <div className="mc-about-grid">
          {FEATURES.map((f) => (
            <button key={f.title} type="button" className="mc-about-card mc-hov" onClick={() => setOpen(f)}>
              <IconBadge name={f.icon} />
              <h5>{f.title}</h5>
              <span className="mc-muted small">{f.short}</span>
              <span className="more">Know more →</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mc-sec2">
        <div className="mc-safe">
          <h2 className="mc-safe-title mc-grad-text">Privacy &amp; safety</h2>
          <p className="mc-muted mb-0">Your health information is personal. This is how we protect it.</p>
          <div className="mc-safe-grid">
            {SAFETY.map((s) => (
              <div key={s.title} className="mc-safe-tile mc-hov">
                <IconBadge name={s.icon} />
                <h6>{s.title}</h6>
                <p className="mc-muted small mb-0">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="small mc-muted mb-0">
            Read our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link>.
            MediCare does not diagnose conditions or replace a qualified doctor. In an emergency, call 112.
          </p>
        </div>
      </section>

      {open && <InfoModal item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}