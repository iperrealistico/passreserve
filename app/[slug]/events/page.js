import { notFound, redirect } from "next/navigation";

import { getOrganizerPage } from "../../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsIndexPage({ params }) {
  const { slug } = await params;
  const organizer = await getOrganizerPage(slug);

  if (!organizer) {
    notFound();
  }

  redirect(`/${slug}`);
}
