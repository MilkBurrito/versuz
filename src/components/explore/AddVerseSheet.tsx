"use client";

// Add-with-translation sheet: preview the verse in each available translation,
// pick one, add — always as a STANDALONE tile (campaigns are added whole via
// addCampaign). Re-adding an existing (verse, translation) opens nothing new —
// the button reflects it (§7 uniqueness).

import { useEffect, useState } from "react";
import { TRANSLATIONS, type ThemeTag, type TranslationCode } from "@/config/game";
import { AVAILABLE_TRANSLATIONS } from "@/lib/bible/books.generated";
import { getVerseText } from "@/lib/bible/client";
import { displayRef } from "@/lib/refs";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { Nameplate } from "@/components/ui/Nameplate";
import { CloseIcon } from "@/components/ui/icons";

export function AddVerseSheet({
  verseId,
  tag = "default",
  onClose,
}: {
  verseId: string;
  tag?: ThemeTag;
  onClose: () => void;
}) {
  const { snapshot, addTile } = useApp();
  const available = TRANSLATIONS.filter((t) =>
    (AVAILABLE_TRANSLATIONS as readonly string[]).includes(t),
  );
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    const pref = snapshot?.user.defaultTranslation ?? "KJV";
    return available.includes(pref) ? pref : (available[0] ?? "KJV");
  });
  const [loaded, setLoaded] = useState<{ key: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const textKey = `${verseId}:${translation}`;
  useEffect(() => {
    let alive = true;
    getVerseText(verseId, translation).then(
      (t) => alive && setLoaded({ key: `${verseId}:${translation}`, text: t }),
    );
    return () => {
      alive = false;
    };
  }, [verseId, translation]);
  const text = loaded?.key === textKey ? loaded.text : null;

  const alreadyAdded = snapshot?.tiles.some(
    (t) => t.verseId === verseId && t.translation === translation,
  );

  return (
    <div className="vz-sheet-up fixed inset-0 z-50 flex flex-col bg-white">
      <div className="w-full bg-[#5b5f68] pb-8 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="mx-auto w-full max-w-2xl">
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded-full p-2 text-white/85 active:bg-white/10"
          >
            <CloseIcon size={20} />
          </button>
          <div className="-mb-12 mt-2 flex justify-center">
            <Nameplate>
              {displayRef(verseId)} {translation}
            </Nameplate>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 overflow-y-auto pb-4 pt-12">
        <div className="mx-auto w-full max-w-xl px-7">
          {text === null ? (
            <p className="text-center text-sm text-ink-faint">Loading…</p>
          ) : (
            <p className="font-serif text-[21px] leading-relaxed text-ink">&ldquo;{text}&rdquo;</p>
          )}
        </div>
      </div>

      <div className="w-full border-t border-black/5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="mx-auto w-full max-w-md px-5">
          <div className="mb-3 flex justify-center gap-2">
            {available.map((t) => (
              <button
                key={t}
                onClick={() => setTranslation(t)}
                className={`rounded-full border-2 px-4 py-1.5 text-[12px] font-extrabold ${
                  t === translation
                    ? "border-gold-deep bg-gold-wash text-gold-deep"
                    : "border-shell-deep/40 bg-white text-ink-soft"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={busy || alreadyAdded || text === null}
            onClick={async () => {
              setBusy(true);
              try {
                await addTile(verseId, translation, tag);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {alreadyAdded ? `Already in your verses (${translation})` : "+ Add to your verses"}
          </Button>
        </div>
      </div>
    </div>
  );
}
