"use client";

// Verse tile row (v1.2: single-select, no chevron; tap opens the pre-match
// overlay). Reference + translation chip + gold mastery bar + level.

import type { Tile } from "@/data/types";
import { displayRef } from "@/lib/refs";
import { levelFromXp, levelProgress } from "@/lib/engine/mastery";
import { isRested } from "@/lib/engine/xp";
import { XPBar } from "@/components/ui/Bars";
import { PixelIcon } from "@/components/ui/icons";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VerseTileRow({ tile, onTap }: { tile: Tile; onTap: () => void }) {
  const level = levelFromXp(tile.verseXp, tile.masteryGoal);
  const progress = levelProgress(tile.verseXp, tile.masteryGoal);
  const rested = isRested(tile.lastPracticedDate, todayStr()) && tile.practiceCount > 0;

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-transform active:scale-[0.985]"
    >
      <span className="rounded-lg bg-shell px-2 py-1 text-[10px] font-bold tracking-wide text-ink-soft">
        {tile.translation}
      </span>
      <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-ink">
        {displayRef(tile.verseId)}
        {rested && (
          <span className="ml-2 align-middle text-[10px] font-sans font-bold text-gold-deep">
            ✦ rested
          </span>
        )}
      </span>
      <span className="w-16 shrink-0">
        <XPBar fraction={level >= 7 ? 1 : progress} height={9} />
      </span>
      <span className="flex w-7 shrink-0 justify-end text-right text-[11px] font-bold text-ink-faint">
        {level >= 7 ? <PixelIcon name="mastered" size={18} alt="Mastered" /> : `L${level}`}
      </span>
    </button>
  );
}
