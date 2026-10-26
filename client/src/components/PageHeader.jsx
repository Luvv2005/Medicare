export default function PageHeader({ title, subtitle }) {
  return (
    <header className="mc-page-head">
      <h2>{title}</h2>
      {subtitle && <p className="mc-muted">{subtitle}</p>}
    </header>
  );
}