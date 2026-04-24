import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";

import { SESSION_COOKIE_NAME, SESSION_PASSWORD } from "./passreserve-config.js";
import {
  validateOrganizerAdminSessionUser,
  validatePlatformAdminSessionUser
} from "./passreserve-auth-security.js";

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

export async function getStoredPlatformSessionUser() {
  const session = await getPassreserveSession();

  return session.platformUser || null;
}

function buildSessionUser(type, admin, organizer = null) {
  const base = {
    type,
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    tokenVersion: Number(admin.tokenVersion || 0)
  };

  if (type === "organizer" && organizer) {
    return {
      ...base,
      organizerId: organizer.id,
      organizerSlug: organizer.slug
    };
  }

  return base;
}

async function invalidateSession(session) {
  delete session.platformUser;
  await session.destroy();
}

export async function signInPlatformAdmin(admin) {
  const session = await getPassreserveSession();

  delete session.platformUser;
  session.user = buildSessionUser("platform", admin);
  await session.save();
}

export async function signInOrganizerAdmin(admin, organizer, options = {}) {
  const session = await getPassreserveSession();
  const preservePlatformSession = Boolean(options.preservePlatformSession);

  if (preservePlatformSession && session.user?.type === "platform") {
    session.platformUser = session.user;
  } else if (!preservePlatformSession) {
    delete session.platformUser;
  }

  session.user = buildSessionUser("organizer", admin, organizer);
  await session.save();
}

export async function signOutPassreserve() {
  const session = await getPassreserveSession();

  delete session.platformUser;
  await session.destroy();
}

export async function restorePlatformAdminSession() {
  const session = await getPassreserveSession();

  if (session.platformUser?.type !== "platform") {
    return false;
  }

  const platformUser = await validatePlatformAdminSessionUser(session.platformUser);

  if (!platformUser) {
    delete session.platformUser;
    await session.save();
    return false;
  }

  session.user = buildSessionUser("platform", platformUser);
  delete session.platformUser;
  await session.save();

  return true;
}

export async function getValidatedStoredPlatformSessionUser() {
  const session = await getPassreserveSession();

  if (session.platformUser?.type !== "platform") {
    return null;
  }

  const admin = await validatePlatformAdminSessionUser(session.platformUser);

  if (!admin) {
    delete session.platformUser;
    await session.save();
    return null;
  }

  return buildSessionUser("platform", admin);
}

export async function getValidatedOrganizerAdminSessionUser(slug) {
  const session = await getPassreserveSession();
  const user = session.user || null;

  if (!user || user.type !== "organizer" || user.organizerSlug !== slug) {
    return null;
  }

  const admin = await validateOrganizerAdminSessionUser(user, slug);

  if (!admin) {
    await invalidateSession(session);
    return null;
  }

  return buildSessionUser("organizer", admin, admin.organizer);
}

export async function requirePlatformAdminSession() {
  const session = await getPassreserveSession();
  const user = session.user || null;

  if (!user || user.type !== "platform") {
    redirect("/admin/login");
  }

  const admin = await validatePlatformAdminSessionUser(user);

  if (!admin) {
    await invalidateSession(session);
    redirect("/admin/login?message=session-expired");
  }

  return buildSessionUser("platform", admin);
}

export async function requireOrganizerAdminSession(slug) {
  const session = await getPassreserveSession();
  const user = session.user || null;

  if (!user || user.type !== "organizer" || user.organizerSlug !== slug) {
    redirect(`/${slug}/admin/login`);
  }

  const admin = await validateOrganizerAdminSessionUser(user, slug);

  if (!admin) {
    await invalidateSession(session);
    redirect(`/${slug}/admin/login?message=session-expired`);
  }

  return buildSessionUser("organizer", admin, admin.organizer);
}
