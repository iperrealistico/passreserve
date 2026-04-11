import { getEditablePlatformContent } from "../../../../lib/passreserve-admin-service.js";
import { updateAboutPageAction } from "../../actions.js";

export const metadata = {
  title: "About page"
};

export default async function PlatformAboutPage({ searchParams }) {
  const query = await searchParams;
  const { aboutPage } = await getEditablePlatformContent();

  return (
    <section className="panel section-card admin-section">
      {query.message ? (
        <div className="registration-message registration-message-success">
          About-page content saved successfully.
        </div>
      ) : null}
      <div className="section-kicker">About page</div>
      <h2>Edit the public Passreserve story</h2>
      <form action={updateAboutPageAction} className="registration-field-grid">
        <label className="field">
          <span>Hero eyebrow</span>
          <input defaultValue={aboutPage.heroEyebrow} name="heroEyebrow" type="text" />
        </label>
        <label className="field field-span">
          <span>Hero title</span>
          <textarea defaultValue={aboutPage.heroTitle} name="heroTitle" rows="2" />
        </label>
        <label className="field field-span">
          <span>Hero summary</span>
          <textarea defaultValue={aboutPage.heroSummary} name="heroSummary" rows="3" />
        </label>
        <label className="field">
          <span>CTA title</span>
          <input defaultValue={aboutPage.sections?.cta?.title || ""} name="ctaTitle" type="text" />
        </label>
        <label className="field field-span">
          <span>CTA detail</span>
          <textarea defaultValue={aboutPage.sections?.cta?.detail || ""} name="ctaDetail" rows="2" />
        </label>
        <div className="hero-actions">
          <button className="button button-primary" type="submit">
            Save about page
          </button>
        </div>
      </form>
    </section>
  );
}
