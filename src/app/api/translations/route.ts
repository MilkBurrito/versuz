// Which API-served translations this deployment can offer — decided by which
// server keys are present (the client never sees the keys, only the verdict).

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const enabled: string[] = [];
  if (process.env.BIBLE_API_KEY) enabled.push("NLT", "NIV", "NASB");
  if (process.env.ESV_API_KEY) enabled.push("ESV");

  // ?debug=1 reports which Bible-ish env var NAMES the runtime can see (never
  // values) — the fastest way to tell "wrong environment scope" from "typo in
  // the name" when a key seems to have no effect. Safe to leave in.
  const body: Record<string, unknown> = { enabled };
  if (new URL(req.url).searchParams.get("debug") === "1") {
    body.visibleKeyNames = Object.keys(process.env)
      .filter((k) => /BIBLE|ESV|API_KEY/i.test(k))
      .sort();
    body.vercelEnv = process.env.VERCEL_ENV ?? null;
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
