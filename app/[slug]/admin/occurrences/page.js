import { notFound } from "next/navigation";

import {
  getOrganizerAdminBySlug,
  getOrganizerAdminSlugs
} from "../../../../lib/passreserve-admin";
import OccurrenceManagementExperience from "./occurrence-management-experience";

export function generateStaticParams() {
  return getOrganizerAdminSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerAdminBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer occurrence planner not found"
    };
  }

  return {
    title: `${organizer.name} occurrence planner`
  };
}

export default async function OrganizerAdminOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const organizer = getOrganizerAdminBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return (
    <OccurrenceManagementExperience
      initialEventSlug={typeof query.event === "string" ? query.event : null}
      organizer={organizer}
    />
  );
}
