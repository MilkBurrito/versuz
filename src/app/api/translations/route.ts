// Which API-served translations this deployment can offer — decided by which
// server keys are present (the client never sees the keys, only the verdict).

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const enabled: string[] = [];
  if (process.env.BIBLE_API_KEY) enabled.push("NLT", "NIV", "NASB");
  if (process.env.ESV_API_KEY) enabled.push("ESV");
  return NextResponse.json(
    { enabled },
    { headers: { "Cache-Control": "public, s-maxage=300" } },
  );
}
