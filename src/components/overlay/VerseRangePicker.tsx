"use client";

// Verse range picker (rev 5): re-target a tile to any contiguous run of verses
// in its chapter — grow, shrink, or shift, date-range-picker style. First tap
// sets the start, second tap the end, third starts over. Any change applies
// the §7 reset (level −2, capped at L3) since the memorization target changes.

import { useState } from "react";
import type { Tile } from "@/data/types";
import { bookDisplayName, parseRef, versesInChapter } from "@/lib/refs";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";

export function VerseRangePicker({ tile, onClose }: { tile: Tile; onClose: () => void }) {
  const { setTileRange } = useApp();
  const ref = parseRef(tile.verseId);
  const total = versesInChapter(ref.book, ref.chapter);
  const origStart = ref.verseStart;
  const origEnd = ref.verseEnd ?? ref.verseStart;

  const [start, setStart] = useState(origStart);
  const [end, setEnd] = useState(origEnd);
  const [anchored, setAnchored] = useState(false); // true = next tap sets the end
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function tap(v: number) {
    setError(null);
    if (!anchored) {
      setStart(v);
      setEnd(v);
      setAnchored(true);
    } else {
      if (v < start) {
        setEnd(start);
        setStart(v);
      } else {
        setEnd(v);
      }
      setAnchored(false);
    }
  }

  const changed = start !== origStart || end !== origEnd;
  const count = end - start + 1;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await setTileRange(tile.id, start, end);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "duplicate_tile"
          ? "You already have a tile for that exact range in this translation."
          : "Couldn't update the range — try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="w-full bg-[#5b5f68] pb-4 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-white/85 active:bg-white/10">
            <CloseIcon size={20} />
          </button>
          <div>
            <h2 className="text-[15px] font-extrabold text-white">
              {bookDisplayName(ref.book)} {ref.chapter}
            </h2>
            <p className="text-[11px] font-bold text-white/70">
              Tap a start verse, then an end verse
            </p>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 overflow-y-auto p-4">
        <div className="mx-auto grid w-full max-w-xl grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: total }, (_, i) => i + 1).map((v) => {
              const inRange = v >= start && v <= end;
              const isEdge = v === start || v === end;
              return (
                <button
                  key={v}
                  onClick={() => tap(v)}
                  className={`rounded-xl py-2.5 text-[14px] font-bold transition-colors ${
                    isEdge
                      ? "bg-gold text-gold-dark shadow-[0_2px_0_rgba(109,79,16,0.35)]"
                      : inRange
                        ? "bg-gold-wash text-gold-deep"
                        : "bg-shell text-ink-soft active:bg-shell-deep/30"
                  }`}
                >
                  {v}
                </button>
              );
            })}
        </div>
      </div>

      <div className="w-full border-t border-black/5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="mx-auto w-full max-w-md px-5">
          <p className="text-center text-[14px] font-extrabold text-ink">
            {bookDisplayName(ref.book)} {ref.chapter}:{start}
            {end > start ? `-${end}` : ""}
            <span className="ml-2 text-[11px] font-bold text-ink-faint">
              {count} verse{count > 1 ? "s" : ""}
            </span>
          </p>
          {changed && (
            <p className="mt-1 text-center text-[11px] font-bold text-gold-deep">
              Changing the range resets this tile&apos;s level (down 2, max Level 3) — the target changes.
            </p>
          )}
          {error && <p className="mt-1 text-center text-[11px] font-bold text-bad">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={confirm} disabled={!changed || busy}>
              Set range
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
