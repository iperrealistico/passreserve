import { notFound } from "next/navigation";

import {
  getOrganizerOperationSlugs,
  getOrganizerOperationsBySlug
} from "../../../../lib/passreserve-operations";
import OperationsDashboardExperience from "./operations-dashboard-experience";

export function generateStaticParams() {
  return getOrganizerOperationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer dashboard not found"
    };
  }

  return {
    title: `${organizer.name} organizer dashboard`
  };
}

export default async function OrganizerAdminDashboardPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return <OperationsDashboardExperience organizer={organizer} />;
}
