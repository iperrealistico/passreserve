import { notFound } from "next/navigation";

import { LegalDocumentPage } from "../../components/legal-document-page.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getLegalDocument } from "../../lib/passreserve-legal.js";

export const metadata = {
  title: "Terms",
  alternates: {
    canonical: "/terms"
  }
};

export default async function TermsPage() {
  const { locale, dictionary } = await getTranslations();
  const document = getLegalDocument(locale, "terms");

  if (!document) {
    notFound();
  }

  return <LegalDocumentPage dictionary={dictionary} document={document} locale={locale} />;
}
