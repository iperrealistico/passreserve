import { notFound } from "next/navigation";

import {
  getOrganizerOperationSlugs,
  getOrganizerOperationsBySlug
} from "../../../../lib/passreserve-operations";
import RegistrationOperationsExperience from "./registration-operations-experience";

export function generateStaticParams() {
  return getOrganizerOperationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer registrations not found"
    };
  }

  return {
    title: `${organizer.name} registrations`
  };
}

export default async function OrganizerAdminRegistrationsPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return <RegistrationOperationsExperience organizer={organizer} />;
}
