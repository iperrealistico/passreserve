import { redirect } from "next/navigation";

export default async function OrganizerOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const nextQuery = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (typeof value === "string" && value) {
      nextQuery.set(key, value);
    }
  }

  const serialized = nextQuery.toString();
  redirect(`/${slug}/admin/calendar${serialized ? `?${serialized}` : ""}`);
}
