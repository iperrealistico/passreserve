"use server";

import { redirect } from "next/navigation";

import {
  approveOrganizerRequest,
  createOrganizerFromPlatform,
  deleteOrganizerFromPlatform,
  getOrganizerImpersonationTarget,
  markAdminLogin,
  resendOrganizerApplicationAccessFromPlatform,
  setOrganizerAdminPasswordFromPlatform,
  suspendOrganizerFromPlatform,
  updateOrganizerBillingSettings,
  updateAboutPage,
  updateEmailTemplate,
  updateSiteSettings
} from "../../lib/passreserve-admin-service.js";
import { getBaseUrl } from "../../lib/passreserve-config.js";
import { sendSharedMailboxReply } from "../../lib/passreserve-mailbox.js";
import {
  authenticatePlatformAdmin,
  requestOrganizerPasswordReset,
  requestPlatformPasswordReset,
  resetPlatformPassword
} from "../../lib/passreserve-service.js";
import {
  clearAdminLoginRateLimit,
  consumeAdminLoginRateLimit
} from "../../lib/passreserve-auth-security.js";
import {
  requirePlatformAdminSession,
  restorePlatformAdminSession,
  signInOrganizerAdmin,
  signInPlatformAdmin,
  signOutPassreserve
} from "../../lib/passreserve-auth.js";

function value(formData, key) {
  return String(formData.get(key) || "").trim();
}

function checked(formData, key) {
  return formData.get(key) === "on";
}

export async function platformLoginAction(formData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const rateLimit = await consumeAdminLoginRateLimit("platform");

  if (!rateLimit.success) {
    redirect("/admin/login?error=rate-limited");
  }

  const admin = await authenticatePlatformAdmin(email, password);

  if (!admin) {
    redirect("/admin/login?error=invalid");
  }

  await clearAdminLoginRateLimit("platform");
  await markAdminLogin("platform", admin.id);
  await signInPlatformAdmin(admin);
  redirect("/admin");
}

export async function platformLogoutAction() {
  await signOutPassreserve();
  redirect("/admin/login?message=signed-out");
}

export async function platformRequestResetAction(formData) {
  await requestPlatformPasswordReset(value(formData, "email"), value(formData, "baseUrl"));
  redirect("/admin/login?message=reset-sent");
}

export async function platformResetPasswordAction(formData) {
  const result = await resetPlatformPassword({
    token: value(formData, "token"),
    password: value(formData, "password")
  });

  if (!result.ok) {
    redirect(`/admin/login/reset/${value(formData, "token")}?error=invalid`);
  }

  redirect("/admin/login?message=password-updated");
}

export async function updateSiteSettingsAction(formData) {
  const user = await requirePlatformAdminSession();

  await updateSiteSettings(
    {
      siteName: value(formData, "siteName"),
      siteDescription: value(formData, "siteDescription"),
      platformEmail: value(formData, "platformEmail"),
      launchInbox: value(formData, "launchInbox"),
      adminNotifications: value(formData, "adminNotifications"),
      registrationRemindersEnabled: checked(formData, "registrationRemindersEnabled"),
      supportResponseTarget: value(formData, "supportResponseTarget"),
      customDomain: value(formData, "customDomain")
    },
    user.userId
  );
  redirect("/admin/settings?message=saved");
}

export async function updateAboutPageAction(formData) {
  const user = await requirePlatformAdminSession();

  await updateAboutPage(
    {
      heroEyebrow: value(formData, "heroEyebrow"),
      heroTitle: value(formData, "heroTitle"),
      heroSummary: value(formData, "heroSummary"),
      ctaTitle: value(formData, "ctaTitle"),
      ctaDetail: value(formData, "ctaDetail")
    },
    user.userId
  );
  redirect("/admin/about?message=saved");
}

export async function updateEmailTemplateAction(formData) {
  const user = await requirePlatformAdminSession();

  await updateEmailTemplate(
    {
      id: value(formData, "id"),
      subject: value(formData, "subject"),
      preview: value(formData, "preview"),
      bodyHtml: value(formData, "bodyHtml")
    },
    user.userId
  );
  redirect("/admin/emails?message=saved");
}

export async function createOrganizerAction(formData) {
  const user = await requirePlatformAdminSession();

  try {
    await createOrganizerFromPlatform(
      {
        name: value(formData, "name"),
        slug: value(formData, "slug"),
        publicSlug: value(formData, "publicSlug"),
        tagline: value(formData, "tagline"),
        description: value(formData, "description"),
        city: value(formData, "city"),
        region: value(formData, "region"),
        publicEmail: value(formData, "publicEmail"),
        publicPhone: value(formData, "publicPhone"),
        venueTitle: value(formData, "venueTitle"),
        venueDetail: value(formData, "venueDetail"),
        venueMapHref: value(formData, "venueMapHref"),
        venuesText: value(formData, "venuesText"),
        adminEmail: value(formData, "adminEmail"),
        adminName: value(formData, "adminName")
      },
      user.userId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The organizer could not be created.";

    redirect(`/admin/organizers?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/organizers?message=created");
}

export async function approveOrganizerRequestAction(formData) {
  const user = await requirePlatformAdminSession();

  await approveOrganizerRequest(value(formData, "requestId"), user.userId);
  redirect("/admin/applications?message=resent");
}

export async function resendOrganizerAccessAction(formData) {
  const user = await requirePlatformAdminSession();
  const result = await resendOrganizerApplicationAccessFromPlatform(
    value(formData, "requestId"),
    user.userId
  );

  if (!result.ok) {
    redirect(`/admin/applications?error=${encodeURIComponent(result.message)}`);
  }

  redirect("/admin/applications?message=resent");
}

export async function sendMailboxReplyAction(formData) {
  const user = await requirePlatformAdminSession();
  const threadId = value(formData, "threadId");
  const result = await sendSharedMailboxReply(threadId, value(formData, "body"), user.userId);

  if (!result.ok) {
    redirect(
      `/admin/emails?tab=mailbox&thread=${encodeURIComponent(threadId)}&error=${encodeURIComponent(result.message)}`
    );
  }

  redirect(`/admin/emails?tab=mailbox&thread=${encodeURIComponent(threadId)}&message=reply-sent`);
}

export async function updateOrganizerBillingAction(formData) {
  const user = await requirePlatformAdminSession();
  const slug = value(formData, "slug");

  await updateOrganizerBillingSettings(
    slug,
    {
      onlinePaymentsMonthlyFeeCents: value(formData, "onlinePaymentsMonthlyFeeCents"),
      onlinePaymentsBillingStatus: value(formData, "onlinePaymentsBillingStatus")
    },
    user.userId
  );
  redirect(`/admin/organizers/${slug}?message=billing-saved`);
}

export async function sendOrganizerResetFromPlatformAction(formData) {
  await requirePlatformAdminSession();
  const slug = value(formData, "slug");
  const email = value(formData, "email");

  await requestOrganizerPasswordReset(slug, email, getBaseUrl());
  redirect(`/admin/organizers/${slug}?message=reset-sent`);
}

export async function setOrganizerPasswordFromPlatformAction(formData) {
  const user = await requirePlatformAdminSession();
  const slug = value(formData, "slug");
  const adminUserId = value(formData, "adminUserId");
  const nextPassword = value(formData, "newPassword");
  const result = await setOrganizerAdminPasswordFromPlatform(
    slug,
    adminUserId,
    nextPassword,
    user.userId
  );

  if (!result.ok) {
    redirect(`/admin/organizers/${slug}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/admin/organizers/${slug}?message=password-updated`);
}

export async function openOrganizerDashboardAction(formData) {
  await requirePlatformAdminSession();
  const slug = value(formData, "slug");
  const login = await getOrganizerImpersonationTarget(slug);

  if (!login) {
    redirect(`/admin/organizers/${slug}?error=${encodeURIComponent("No active organizer admin is available.")}`);
  }

  await signInOrganizerAdmin(login.admin, login.organizer, {
    preservePlatformSession: true
  });
  redirect(`/${slug}/admin/dashboard?message=impersonated`);
}

export async function restorePlatformDashboardAction() {
  const restored = await restorePlatformAdminSession();

  if (!restored) {
    redirect("/admin/login");
  }

  redirect("/admin");
}

export async function suspendOrganizerAction(formData) {
  const user = await requirePlatformAdminSession();
  const slug = value(formData, "slug");

  await suspendOrganizerFromPlatform(slug, user.userId);
  redirect(`/admin/organizers/${slug}?message=status-updated`);
}

export async function deleteOrganizerAction(formData) {
  const user = await requirePlatformAdminSession();
  const slug = value(formData, "slug");

  await deleteOrganizerFromPlatform(slug, user.userId);
  redirect("/admin/organizers?message=deleted");
}
