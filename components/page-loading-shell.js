function LoadingCard({ eyebrow, title, summary, variant = "admin" }) {
  return (
    <section className={`panel section-card page-loading-shell page-loading-shell-${variant}`}>
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
    <main className="shell admin-shell">
      <div className="content">
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
    <main className="shell admin-shell auth-page">
      <div className="content auth-content">
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
