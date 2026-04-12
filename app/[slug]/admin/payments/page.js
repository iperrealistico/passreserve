import { redirect } from "next/navigation";

export default async function OrganizerPaymentsRedirectPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const nextQuery = new URLSearchParams();

  if (typeof query.event === "string" && query.event) {
    nextQuery.set("event", query.event);
  }

  if (typeof query.message === "string" && query.message) {
    nextQuery.set("message", query.message);
  }

  if (typeof query.error === "string" && query.error) {
    nextQuery.set("error", query.error);
  }

  const serialized = nextQuery.toString();
  redirect(`/${slug}/admin/registrations${serialized ? `?${serialized}` : ""}`);
}
