import { notFound } from "next/navigation";

import {
  getOrganizerOperationSlugs,
  getOrganizerOperationsBySlug
} from "../../../../lib/passreserve-operations";
import PaymentOperationsExperience from "./payment-operations-experience";

export function generateStaticParams() {
  return getOrganizerOperationSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer payments not found"
    };
  }

  return {
    title: `${organizer.name} payment operations`
  };
}

export default async function OrganizerAdminPaymentsPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerOperationsBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return <PaymentOperationsExperience organizer={organizer} />;
}
