"use client";

// The translations THIS deployment can actually serve, in TRANSLATIONS order:
// the committed local datasets plus whatever /api/translations reports enabled
// (which depends on the server's keys). One fetch per session.

import { useEffect, useState } from "react";
import { TRANSLATIONS, type TranslationCode } from "@/config/game";
import { AVAILABLE_TRANSLATIONS } from "@/lib/bible/books.generated";

let apiEnabled: TranslationCode[] | null = null;
let inFlight: Promise<TranslationCode[]> | null = null;

function fetchApiEnabled(): Promise<TranslationCode[]> {
  if (apiEnabled) return Promise.resolve(apiEnabled);
  if (!inFlight) {
    inFlight = fetch("/api/translations")
      .then(async (r) => {
        if (!r.ok) return [];
        const j = (await r.json()) as { enabled: string[] };
        return j.enabled.filter((t): t is TranslationCode =>
          (TRANSLATIONS as readonly string[]).includes(t),
        );
      })
      .catch(() => [] as TranslationCode[])
      .then((list) => {
        apiEnabled = list;
        return list;
      });
  }
  return inFlight;
}

export function localTranslations(): TranslationCode[] {
  return TRANSLATIONS.filter((t) =>
    (AVAILABLE_TRANSLATIONS as readonly string[]).includes(t),
  );
}

/** Local translations immediately; API-served ones appended once confirmed. */
export function useAvailableTranslations(): TranslationCode[] {
  const [list, setList] = useState<TranslationCode[]>(() =>
    apiEnabled ? merge(apiEnabled) : localTranslations(),
  );
  useEffect(() => {
    let alive = true;
    void fetchApiEnabled().then((api) => alive && setList(merge(api)));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

function merge(api: TranslationCode[]): TranslationCode[] {
  const set = new Set<TranslationCode>([...localTranslations(), ...api]);
  return TRANSLATIONS.filter((t) => set.has(t));
}
