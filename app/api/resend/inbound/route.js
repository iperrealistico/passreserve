import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  void request;

  return NextResponse.json(
    {
      ok: false,
      retired: true,
      message: "Inbound mailbox is retired. Cloudflare Workers handle inbound email now."
    },
    {
      status: 410
    }
  );
}
