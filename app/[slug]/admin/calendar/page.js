import { notFound } from "next/navigation";

import {
  getOrganizerOperationSlugs,
  getOrganizerOperationsBySlug
} from "../../../../lib/passreserve-operations";
import OperationsCalendarExperience from "./operations-calendar-experience";

export function generateStaticParams() {
  return getOrganizerOperationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer calendar not found"
    };
  }

  return {
    title: `${organizer.name} organizer calendar`
  };
}

export default async function OrganizerAdminCalendarPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return <OperationsCalendarExperience organizer={organizer} />;
}
