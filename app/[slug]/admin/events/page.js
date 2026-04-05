import { notFound } from "next/navigation";

import {
  getOrganizerAdminBySlug,
  getOrganizerAdminSlugs
} from "../../../../lib/passreserve-admin";
import EventCatalogExperience from "./event-catalog-experience";

export function generateStaticParams() {
  return getOrganizerAdminSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerAdminBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer admin not found"
    };
  }

  return {
    title: `${organizer.name} event catalog`
  };
}

export default async function OrganizerAdminEventsPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerAdminBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return <EventCatalogExperience organizer={organizer} />;
}
