export default function PageStub({ title, step }) {
  return (
    <div className="container py-4">
      <div className="mc-card">
        <h2>{title}</h2>
        <p className="mc-muted mb-0">This page will be fully built in Step {step}.</p>
      </div>
    </div>
  );
}