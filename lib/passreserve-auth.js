import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";

import { SESSION_COOKIE_NAME, SESSION_PASSWORD } from "./passreserve-config.js";

const sessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: SESSION_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/"
  }
};

export async function getPassreserveSession() {
  return getIronSession(await cookies(), sessionOptions);
}

export async function getCurrentSessionUser() {
  const session = await getPassreserveSession();

  return session.user || null;
}

export async function signInPlatformAdmin(admin) {
  const session = await getPassreserveSession();

  session.user = {
    type: "platform",
    userId: admin.id,
    email: admin.email,
    name: admin.name
  };
  await session.save();
}

export async function signInOrganizerAdmin(admin, organizer) {
  const session = await getPassreserveSession();

  session.user = {
    type: "organizer",
    userId: admin.id,
    organizerId: organizer.id,
    organizerSlug: organizer.slug,
    email: admin.email,
    name: admin.name
  };
  await session.save();
}

export async function signOutPassreserve() {
  const session = await getPassreserveSession();

  await session.destroy();
}

export async function requirePlatformAdminSession() {
  const user = await getCurrentSessionUser();

  if (!user || user.type !== "platform") {
    redirect("/admin/login");
  }

  return user;
}

export async function requireOrganizerAdminSession(slug) {
  const user = await getCurrentSessionUser();

  if (!user || user.type !== "organizer" || user.organizerSlug !== slug) {
    redirect(`/${slug}/admin/login`);
  }

  return user;
}
