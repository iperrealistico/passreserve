import { getEditablePlatformContent } from "../../../../lib/passreserve-admin-service.js";
import { updateEmailTemplateAction } from "../../actions.js";

export const metadata = {
  title: "Emails"
};

export default async function PlatformEmailsPage({ searchParams }) {
  const query = await searchParams;
  const { emailTemplates } = await getEditablePlatformContent();

  return (
    <section className="panel section-card admin-section">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Email template saved successfully.
        </div>
      ) : null}
      <div className="section-kicker">Transactional email</div>
      <h2>Edit live email templates</h2>
      <div className="admin-card-grid">
        {emailTemplates.map((template) => (
          <article className="admin-card" key={template.id}>
            <div className="admin-card-head">
              <div>
                <div className="admin-badge-row">
                  <span className="admin-badge admin-badge-public">{template.category}</span>
                  <span className="admin-badge admin-badge-unlisted">{template.audience}</span>
                </div>
                <h4>{template.slug}</h4>
                <p>{template.trigger}</p>
              </div>
            </div>

            <form action={updateEmailTemplateAction} className="registration-panel-stack">
              <input name="id" type="hidden" value={template.id} />
              <label className="field">
                <span>Subject</span>
                <input defaultValue={template.subject} name="subject" type="text" />
              </label>
              <label className="field">
                <span>Preview</span>
                <textarea defaultValue={template.preview} name="preview" rows="2" />
              </label>
              <label className="field">
                <span>HTML body</span>
                <textarea defaultValue={template.bodyHtml} name="bodyHtml" rows="8" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Save template
                </button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
