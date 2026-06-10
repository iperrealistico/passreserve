import { notFound } from "next/navigation";

import { LegalDocumentPage } from "../../components/legal-document-page.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getLegalDocument } from "../../lib/passreserve-legal.js";

export const metadata = {
  title: "Cookie Policy"
};

export default async function CookiePolicyPage() {
  const { locale, dictionary } = await getTranslations();
  const document = getLegalDocument(locale, "cookie-policy");

  if (!document) {
    notFound();
  }

  return <LegalDocumentPage dictionary={dictionary} document={document} locale={locale} />;
}
