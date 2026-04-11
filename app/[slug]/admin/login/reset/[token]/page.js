import Link from "next/link";

import { organizerResetPasswordAction } from "../../../actions.js";

export const metadata = {
  title: "Reset organizer password"
};

export default async function OrganizerResetPasswordPage({ params, searchParams }) {
  const { slug, token } = await params;
  const query = await searchParams;

  return (
    <section className="hero hero-single">
      <article className="panel hero-copy hero-stack hero-single-panel">
        <div className="section-kicker">Organizer reset</div>
        <h1>Choose a new password for this organizer admin.</h1>
        {query.error ? (
          <div className="registration-message registration-message-error">
            This reset link is invalid or has expired.
          </div>
        ) : null}
        <form action={organizerResetPasswordAction} className="registration-panel-stack">
          <input name="slug" type="hidden" value={slug} />
          <input name="token" type="hidden" value={token} />
          <label className="field">
            <span>New password</span>
            <input name="password" type="password" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              Save password
            </button>
            <Link className="button button-secondary" href={`/${slug}/admin/login`}>
              Back to sign in
            </Link>
          </div>
        </form>
      </article>
    </section>
  );
}
