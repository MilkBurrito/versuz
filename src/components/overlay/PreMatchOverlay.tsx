"use client";

// §13-C pre-match overlay: full-SCREEN (opaque — nothing shows behind it).
// Gem journey across the top, gold reference nameplate, the verse laid out
// large (the read-before-you-fight step), and the action row:
// Delete · Practice (+live XP) · Translation, plus Edit verse range (rev 5).

import { useEffect, useMemo, useState } from "react";
import { GAME, type TranslationCode } from "@/config/game";
import type { Tile } from "@/data/types";
import { getVerseText } from "@/lib/bible/client";
import { useAvailableTranslations } from "@/lib/bible/available";
import { ATTRIBUTION, ESV_LINK } from "@/lib/bible/translations";
import { energyAt, secondsToNextEnergy } from "@/lib/engine/energy";
import { levelFromXp } from "@/lib/engine/mastery";
import { displayRef, parseRef, versesInChapter } from "@/lib/refs";
import { previewPracticeXp, useApp } from "@/state/store";
import { TEXT } from "@/copy/strings";
import { Button } from "@/components/ui/Button";
import { GemJourney } from "@/components/ui/GemJourney";
import { Nameplate } from "@/components/ui/Nameplate";
import { CloseIcon, PixelIcon } from "@/components/ui/icons";
import { formatEta } from "@/components/ui/StatusBar";
import { VerseRangePicker } from "@/components/overlay/VerseRangePicker";

type Confirm = { kind: "delete" } | { kind: "translation"; to: TranslationCode };

export function PreMatchOverlay({ tile }: { tile: Tile }) {
  const { closeOverlay, startPractice, deleteTile, changeTranslation, snapshot } = useApp();
  const [loaded, setLoaded] = useState<{ key: string; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const textKey = `${tile.verseId}:${tile.translation}`;
  useEffect(() => {
    let alive = true;
    getVerseText(tile.verseId, tile.translation).then(
      (text) => alive && setLoaded({ key: `${tile.verseId}:${tile.translation}`, text }),
    );
    return () => {
      alive = false;
    };
  }, [tile.verseId, tile.translation]);
  // Stale text (from a previous verse/translation) never flashes.
  const verseText = loaded?.key === textKey ? loaded.text : null;

  const level = levelFromXp(tile.verseXp, tile.masteryGoal);
  const xpPreview = previewPracticeXp(tile);
  const energy = snapshot ? energyAt(snapshot.user.energy, now) : null;
  const noEnergy = (energy?.current ?? 0) < GAME.energy.COST_PER_MATCH;
  const regenEta = snapshot ? secondsToNextEnergy(snapshot.user.energy, now) : null;

  // Translations offered = loaded data ∩ not already held for this verse (§7).
  const heldTranslations = useMemo(
    () =>
      new Set(
        (snapshot?.tiles ?? [])
          .filter((t) => t.verseId === tile.verseId)
          .map((t) => t.translation),
      ),
    [snapshot, tile.verseId],
  );
  const available = useAvailableTranslations();

  const ref = parseRef(tile.verseId);
  const chapterHasRange = versesInChapter(ref.book, ref.chapter) > 1;

  return (
    // Full-bleed surface: every band spans the viewport; content centers inside.
    <div className="vz-sheet-up fixed inset-0 z-40 flex flex-col overflow-hidden bg-white">
      {/* dark header: close + gem journey + reference nameplate */}
      <div className="w-full bg-[#5b5f68] pb-0 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="mx-auto w-full max-w-2xl">
          <button
            onClick={closeOverlay}
            aria-label="Close"
            className="ml-4 rounded-full p-2 text-white/85 active:bg-white/10"
          >
            <CloseIcon size={20} />
          </button>
          <div className="mt-1 pb-5">
            <GemJourney currentLevel={level} />
          </div>
          <div className="flex justify-center">
            <div className="-mb-4 translate-y-1/6">
              <Nameplate>
                {displayRef(tile.verseId)} {tile.translation}
              </Nameplate>
            </div>
          </div>
        </div>
      </div>

      {/* verse text — the read step */}
      <div className="w-full flex-1 overflow-y-auto pb-4 pt-10">
        <div className="mx-auto w-full max-w-xl px-7">
          {verseText === null ? (
            <p className="text-center text-sm text-ink-faint">{TEXT.preMatch.loading}</p>
          ) : (
            <p className="font-serif text-[22px] leading-relaxed text-ink">
              &ldquo;{verseText}&rdquo;
            </p>
          )}
          {ATTRIBUTION[tile.translation] && (
            <p className="mt-4 text-center text-[10px] leading-relaxed text-ink-faint">
              {tile.translation === "ESV" ? "(ESV) " : ""}
              {ATTRIBUTION[tile.translation]}{" "}
              {tile.translation === "ESV" && (
                <a href={ESV_LINK} target="_blank" rel="noreferrer" className="underline">
                  esv.org
                </a>
              )}
            </p>
          )}
          {/* No progress bar here on purpose — the gem journey at the top of
              this screen IS the level track. Only the number needs saying. */}
          <p className="mt-8 text-center text-[11px] font-bold text-ink-faint">
            {level >= 7
              ? TEXT.preMatch.mastered
              : TEXT.preMatch.progress(level, tile.verseXp, tile.masteryGoal)}
          </p>
        </div>
      </div>

      {/* action row */}
      <div className="w-full border-t border-black/5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="mx-auto w-full max-w-md px-5">
          <div className="flex items-stretch gap-2.5">
            <Button
              variant="danger"
              aria-label="Delete tile"
              className="px-3.5"
              onClick={() => setConfirm({ kind: "delete" })}
            >
              <PixelIcon name="delete" size={22} alt="" />
            </Button>
            <Button
              className="flex-1 whitespace-nowrap"
              disabled={noEnergy || busy || verseText === null}
              onClick={async () => {
                setBusy(true);
                try {
                  await startPractice(tile.id);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {noEnergy ? (
                TEXT.preMatch.noEnergy(regenEta !== null ? formatEta(regenEta) : null)
              ) : (
                <>
                  <PixelIcon name="slot-weapon" size={20} className="mr-1.5 align-[-4px]" alt="" />
                  {TEXT.preMatch.start(xpPreview)}
                </>
              )}
            </Button>
            <Button
              variant="info"
              className="px-3.5"
              disabled={available.length <= 1}
              title="Change translation"
              onClick={() => setPickerOpen(true)}
            >
              {tile.translation}
            </Button>
          </div>
          {chapterHasRange && (
            <button
              className="mt-2.5 w-full text-center text-[12px] font-bold text-ink-soft underline-offset-2 active:underline"
              onClick={() => setRangePickerOpen(true)}
            >
              {TEXT.preMatch.editRange}
            </button>
          )}
        </div>
      </div>

      {rangePickerOpen && (
        <VerseRangePicker tile={tile} onClose={() => setRangePickerOpen(false)} />
      )}

      {pickerOpen && (
        <TranslationPicker
          current={tile.translation}
          available={available}
          held={heldTranslations}
          onClose={() => setPickerOpen(false)}
          onPick={(to) => {
            setPickerOpen(false);
            setConfirm({ kind: "translation", to });
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          tile={tile}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              if (confirm.kind === "delete") await deleteTile(tile.id);
              else await changeTranslation(tile.id, confirm.to);
              setConfirm(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  confirm,
  tile,
  busy,
  onCancel,
  onConfirm,
}: {
  confirm: Confirm;
  tile: Tile;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy =
    confirm.kind === "delete"
      ? {
          title: TEXT.preMatch.deleteTitle(displayRef(tile.verseId)),
          body: TEXT.preMatch.deleteBody,
          action: TEXT.preMatch.deleteAction,
          danger: true,
        }
      : {
          title: TEXT.preMatch.switchTitle(confirm.to),
          body: TEXT.preMatch.switchBody,
          action: TEXT.preMatch.switchAction,
          danger: false,
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-8">
      <div className="vz-pop w-full max-w-xs rounded-3xl bg-white p-5">
        <h2 className="text-[16px] font-extrabold text-ink">{copy.title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{copy.body}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={copy.danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {copy.action}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Every translation this deployment can serve (public-domain KJV/ASV plus any
 * licensed ones the server has keys for). The one in use is marked; a verse
 * already held in another translation can't be switched into — that would make
 * a duplicate tile — so it's shown as already added.
 */
function TranslationPicker({
  current,
  available,
  held,
  onClose,
  onPick,
}: {
  current: TranslationCode;
  available: readonly TranslationCode[];
  held: Set<string>;
  onClose: () => void;
  onPick: (to: TranslationCode) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="vz-sheet-up w-full rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-full max-w-md px-5">
          <h2 className="text-[16px] font-extrabold text-ink">Translation</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            Switching re-learns the verse — the words change, so progress starts over.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {available.map((code) => {
              const isCurrent = code === current;
              const alreadyHeld = !isCurrent && held.has(code);
              return (
                <button
                  key={code}
                  disabled={isCurrent || alreadyHeld}
                  onClick={() => onPick(code)}
                  className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                    isCurrent
                      ? "border-gold bg-gold-wash"
                      : alreadyHeld
                        ? "border-shell bg-shell"
                        : "border-shell-deep/40 bg-white active:bg-shell"
                  }`}
                >
                  <span
                    className={`text-[15px] font-extrabold ${
                      isCurrent ? "text-gold-deep" : alreadyHeld ? "text-ink-faint" : "text-ink"
                    }`}
                  >
                    {code}
                  </span>
                  <span className="text-[11px] font-bold text-ink-faint">
                    {isCurrent ? "in use" : alreadyHeld ? "already added" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
