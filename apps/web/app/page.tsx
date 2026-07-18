const AREAS = [
  'Projects',
  'Build profiles',
  'Builds',
  'Live logs',
  'Artifacts',
  'Credentials',
  'Store connections',
  'Submissions',
  'Runners',
  'Settings & retention',
  'Audit log',
];

export default function DashboardPage() {
  return (
    <main className="container">
      <h1>Native Kiln</h1>
      <p className="muted">
        Private mobile build and submission platform. Phase 0 scaffold — the control plane,
        builders, and runners arrive in later phases.
      </p>

      <div className="panel" style={{ margin: '1.5rem 0' }}>
        <strong>Status:</strong> control plane scaffold online. <a href="/login">Sign in</a> to
        continue.
      </div>

      <h2>Planned dashboard areas</h2>
      <div className="grid">
        {AREAS.map((area) => (
          <div key={area} className="panel">
            <strong>{area}</strong>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
              Coming in a later phase
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
