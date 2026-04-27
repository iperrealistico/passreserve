import { NextResponse } from "next/server";

import { getValidatedStoredPlatformSessionUser } from "../../../../../lib/passreserve-auth.js";
import { getSharedMailboxAttachmentRedirect } from "../../../../../lib/passreserve-mailbox.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const user = await getValidatedStoredPlatformSessionUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const { attachmentId } = await params;
  const resolved = await getSharedMailboxAttachmentRedirect(attachmentId);

  if (!resolved?.downloadUrl) {
    return NextResponse.json(
      {
        ok: false,
        message: "Attachment not found."
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.redirect(resolved.downloadUrl, {
    status: 302
  });
}
