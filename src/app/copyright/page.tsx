"use client";

// Scripture copyright page (Build Brief Phase 2 licensing requirements).
// Every licensed translation's full notice lives here; the read view shows
// the short attribution inline. ESV additionally requires the esv.org link.

import Link from "next/link";
import { ATTRIBUTION, ESV_LINK } from "@/lib/bible/translations";
import { useAvailableTranslations } from "@/lib/bible/available";

export default function CopyrightPage() {
  const available = useAvailableTranslations();
  return (
    <main className="min-h-dvh bg-cream px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-[20px] font-extrabold text-ink">Scripture copyright</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Versuz quotes Scripture from the following translations.
        </p>

        <section className="mt-6 space-y-4 text-[13px] leading-relaxed text-ink-soft">
          <div>
            <h2 className="font-extrabold text-ink">King James Version (KJV)</h2>
            <p>Public domain.</p>
          </div>
          <div>
            <h2 className="font-extrabold text-ink">American Standard Version (ASV)</h2>
            <p>Public domain.</p>
          </div>
          {available.includes("NLT") && (
            <div>
              <h2 className="font-extrabold text-ink">New Living Translation (NLT)</h2>
              <p>{ATTRIBUTION.NLT}</p>
            </div>
          )}
          {available.includes("NIV") && (
            <div>
              <h2 className="font-extrabold text-ink">New International Version (NIV)</h2>
              <p>{ATTRIBUTION.NIV}</p>
            </div>
          )}
          {available.includes("NASB") && (
            <div>
              <h2 className="font-extrabold text-ink">New American Standard Bible (NASB)</h2>
              <p>{ATTRIBUTION.NASB}</p>
            </div>
          )}
          {available.includes("ESV") && (
            <div>
              <h2 className="font-extrabold text-ink">English Standard Version (ESV)</h2>
              <p>
                {ATTRIBUTION.ESV}{" "}
                <a href={ESV_LINK} target="_blank" rel="noreferrer" className="underline">
                  esv.org
                </a>
              </p>
            </div>
          )}
        </section>

        <Link
          href="/settings"
          className="mt-8 inline-block text-[13px] font-bold text-gold-deep underline-offset-2 hover:underline"
        >
          ← Back to Settings
        </Link>
      </div>
    </main>
  );
}
