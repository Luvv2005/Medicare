// Legal review ke baad SHOW_DRAFT_NOTICE ko false kar do.
const SHOW_DRAFT_NOTICE = true;

export default function LegalPage({ title, intro, sections }) {
  return (
    <div className="container-xl py-4">
      <div className="mc-legal">
        <header className="mc-page-head">
          <h2>{title}</h2>
          {intro && <p className="mc-muted">{intro}</p>}
        </header>
        {SHOW_DRAFT_NOTICE && (
          <div className="mc-note mc-note--warn mb-4 small">
            This is a draft and must be reviewed by a legal professional before the platform is used
            with real patients.
          </div>
        )}
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