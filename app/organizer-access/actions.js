"use server";

import { redirect } from "next/navigation";

import { slugify } from "../../lib/passreserve-format.js";

function value(formData, key) {
  return String(formData.get(key) || "").trim();
}

export async function openOrganizerAccessAction(formData) {
  const slug = slugify(value(formData, "slug"));

  if (!slug) {
    redirect("/organizer-access?error=missing");
  }

  redirect(`/${slug}/admin/login`);
}
