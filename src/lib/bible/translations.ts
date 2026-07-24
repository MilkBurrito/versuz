// Translation metadata (Build Brief Phase 2). Two supply chains:
//
//  · LOCAL — public-domain datasets committed to the repo (KJV, ASV; WEB when
//    its verified dataset is harvested). Loaded as static JSON maps.
//  · API — licensed texts served on demand through our server proxy
//    (/api/verse), never cached wholesale, keys never in the client bundle:
//      NLT / NIV / NASB  → api.bible   (BIBLE_API_KEY)
//      ESV               → api.esv.org (ESV_API_KEY — ≤500-verse rolling
//                          cache + throttling per Crossway's terms; see
//                          docs/translations.md for the licensing constraints)
//
// A tile stores the canonical reference + chosen translation, so a user's
// verses re-render in whichever translation they pick.

import type { TranslationCode } from "@/config/game";

/** Translations that go through the server proxy. */
export const API_TRANSLATIONS = ["NLT", "NIV", "NASB", "ESV"] as const;
export type ApiTranslation = (typeof API_TRANSLATIONS)[number];

export function isApiTranslation(t: TranslationCode): t is ApiTranslation {
  return (API_TRANSLATIONS as readonly string[]).includes(t);
}

/** api.bible Bible IDs licensed on this key (verified 2026-07-24). */
export const API_BIBLE_IDS: Record<Exclude<ApiTranslation, "ESV">, string> = {
  NLT: "d6e14a625393b4da-01",
  NIV: "78a9f6124f344018-01",
  NASB: "b8ee27bcd1cae43a-01",
};

/**
 * Required attribution, shown wherever licensed text is read (the pre-Stand
 * read view) and in full on /copyright. api.bible also returns per-passage
 * copyright; the static notices below are the publishers' standard forms.
 */
export const ATTRIBUTION: Partial<Record<TranslationCode, string>> = {
  NLT: "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers. All rights reserved.",
  NIV: "Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc. Used with permission. All rights reserved worldwide.",
  NASB: "Scripture quotations taken from the NASB® New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation. Used by permission. All rights reserved. lockman.org",
  ESV: "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.",
};

/** ESV display rules require a link to esv.org wherever its text appears. */
export const ESV_LINK = "https://www.esv.org";
