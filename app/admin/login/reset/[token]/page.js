import Link from "next/link";

import { platformResetPasswordAction } from "../../../actions.js";

export const metadata = {
  title: "Reset team password"
};

export default async function PlatformResetPasswordPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;

  return (
    <main className="shell admin-shell">
      <div className="content">
        <header className="topbar admin-topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">Reset platform access</span>
          </div>
          <nav className="nav" aria-label="Reset navigation">
            <Link href="/admin/login">Back to sign in</Link>
          </nav>
        </header>

        <section className="hero hero-single">
          <article className="panel hero-copy hero-stack hero-single-panel">
            <div className="section-kicker">Reset password</div>
            <h1>Choose a new password for team access.</h1>
            {query.error ? (
              <div className="registration-message registration-message-error">
                This reset link is invalid or has expired.
              </div>
            ) : null}
            <form action={platformResetPasswordAction} className="registration-panel-stack">
              <input name="token" type="hidden" value={token} />
              <label className="field">
                <span>New password</span>
                <input name="password" type="password" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Save password
                </button>
              </div>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
