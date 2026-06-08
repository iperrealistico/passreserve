function LoadingCard({ eyebrow, title, summary, variant = "admin" }) {
  return (
    <section className={`page-loading-shell page-loading-shell-${variant}`}>
      <div aria-hidden="true" className="page-loading-shell-glow" />
      <div aria-hidden="true" className="page-loading-shell-spinner-stack">
        <span className="page-loading-shell-ring page-loading-shell-ring-outer" />
        <span className="page-loading-shell-ring page-loading-shell-ring-inner" />
        <span className="page-loading-shell-dot" />
      </div>
      <div className="page-loading-copy">
        <div className="page-loading-kicker">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      <div aria-hidden="true" className="page-loading-skeletons">
        <span className="page-loading-bar page-loading-bar-wide" />
        <span className="page-loading-bar" />
        <span className="page-loading-bar page-loading-bar-muted" />
      </div>
    </section>
  );
}

export function OrganizerAdminLoadingShell() {
  return (
    <main className="page-loading-screen page-loading-screen-admin">
      <div className="page-loading-screen-inner">
        <LoadingCard
          eyebrow="Organizer admin"
          summary="Loading the next organizer admin page, controls, and operational context."
          title="Preparing the organizer dashboard"
          variant="admin"
        />
      </div>
    </main>
  );
}

export function AuthPageLoadingShell() {
  return (
    <main className="page-loading-screen page-loading-screen-auth">
      <div className="page-loading-screen-inner">
        <LoadingCard
          eyebrow="Secure access"
          summary="Loading the next sign-in or access step."
          title="Preparing the secure page"
          variant="auth"
        />
      </div>
    </main>
  );
}
