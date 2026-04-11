import { notFound, redirect } from "next/navigation";

import { getOrganizerShell } from "../../../lib/passreserve-admin-service.js";

export default async function OrganizerAdminIndexPage({ params }) {
  const { slug } = await params;

  if (!(await getOrganizerShell(slug))) {
    notFound();
  }

  redirect(`/${slug}/admin/dashboard`);
}
