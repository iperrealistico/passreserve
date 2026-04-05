import { notFound, redirect } from "next/navigation";

import {
  getOrganizerOperationSlugs,
  getOrganizerOperationsBySlug
} from "../../../lib/passreserve-operations";

export function generateStaticParams() {
  return getOrganizerOperationSlugs().map((slug) => ({ slug }));
}

export default async function OrganizerAdminIndexPage({ params }) {
  const { slug } = await params;

  if (!getOrganizerOperationsBySlug(slug)) {
    notFound();
  }

  redirect(`/${slug}/admin/dashboard`);
}
