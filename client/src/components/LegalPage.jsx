export default function LegalPage({ title, intro, sections }) {
  return (
    <div className="container-xl py-4">
      <div className="mc-legal">
        <header className="mc-page-head">
          <h2>{title}</h2>
          {intro && <p className="mc-muted">{intro}</p>}
        </header>
        <div className="mc-note mc-note--warn mb-4 small">
          This is a draft for project demonstration. It must be reviewed by a legal professional
          before the platform is used with real patients.
        </div>
        {sections.map((s) => (
          <section className="mb-4" key={s.title}>
            <h5>{s.title}</h5>
            <p className="mb-0">{s.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}