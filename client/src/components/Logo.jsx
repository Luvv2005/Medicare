export default function Logo({ small = false }) {
  return (
    <span className={`mc-brand ${small ? 'mc-brand--sm' : ''}`}>
      <span className="mc-brand-icon" aria-hidden="true" />
      <span className="mc-brand-text">MediCare</span>
    </span>
  );
}