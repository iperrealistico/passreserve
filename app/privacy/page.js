import { notFound } from "next/navigation";

import { LegalDocumentPage } from "../../components/legal-document-page.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getLegalDocument } from "../../lib/passreserve-legal.js";

export const metadata = {
  title: "Privacy"
};

export default async function PrivacyPage() {
  const { locale, dictionary } = await getTranslations();
  const document = getLegalDocument(locale, "privacy");

  if (!document) {
    notFound();
  }

  return <LegalDocumentPage dictionary={dictionary} document={document} locale={locale} />;
}
