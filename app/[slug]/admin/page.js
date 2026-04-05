import { notFound, redirect } from "next/navigation";

import {
  getOrganizerAdminBySlug,
  getOrganizerAdminSlugs
} from "../../../lib/passreserve-admin";

export function generateStaticParams() {
  return getOrganizerAdminSlugs().map((slug) => ({ slug }));
}

export default async function OrganizerAdminIndexPage({ params }) {
  const { slug } = await params;

  if (!getOrganizerAdminBySlug(slug)) {
    notFound();
  }

  redirect(`/${slug}/admin/events`);
}
