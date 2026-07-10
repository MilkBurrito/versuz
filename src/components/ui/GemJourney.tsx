// §9-A Per-verse gem level-journey map: seven gem nodes on a path, completed
// lit, current enlarged + glowing, upcoming dimmed; chest nodes mark levels
// where a real reward drops. Presentation only — levels stay XP-derived.

"use client";

import { useEffect, useRef } from "react";
import { GAME, type VerseLevel } from "@/config/game";
import { PixelIcon } from "@/components/ui/icons";

export function GemJourney({ currentLevel }: { currentLevel: VerseLevel }) {
  const chestLevels = new Set<number>(GAME.gemJourney.CHEST_LEVELS);
  const scroller = useRef<HTMLDivElement>(null);
  // Keep the current level's node in view (the path is wider than a phone).
  useEffect(() => {
    scroller.current
      ?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [currentLevel]);
  return (
    <div ref={scroller} className="flex items-start overflow-x-auto px-4">
      <div className="mx-auto flex items-start">
      {([1, 2, 3, 4, 5, 6, 7] as VerseLevel[]).map((level, i) => {
        const state =
          level < currentLevel ? "done" : level === currentLevel ? "current" : "locked";
        return (
          <div key={level} className="flex items-start">
            {i > 0 && (
              <div
                className="mt-[26px] h-[3px] w-4 shrink-0 sm:w-6"
                style={{
                  background:
                    level <= currentLevel ? "var(--color-gem)" : "rgba(255,255,255,0.22)",
                }}
              />
            )}
            <GemNode level={level} state={state} chest={chestLevels.has(level)} />
          </div>
        );
      })}
      </div>
    </div>
  );
}

function GemNode({
  level,
  state,
  chest,
}: {
  level: number;
  state: "done" | "current" | "locked";
  chest: boolean;
}) {
  const big = state === "current";
  const tile = big ? 56 : 42;
  return (
    <div className="flex w-[52px] shrink-0 flex-col items-center sm:w-[60px]">
      <div
        data-current={state === "current" || undefined}
        className={`flex items-center justify-center rounded-xl transition-all ${big ? "vz-glow -mt-1" : "mt-1"}`}
        style={{
          width: tile,
          height: tile,
          background:
            state === "locked" ? "rgba(255,255,255,0.10)" : "var(--color-gem-tile)",
          border: `2px solid ${state === "locked" ? "rgba(255,255,255,0.16)" : big ? "var(--color-gem)" : "#565e70"}`,
          opacity: state === "locked" ? 0.75 : 1,
        }}
      >
        {chest ? (
          <PixelIcon
            name="chest"
            size={big ? 32 : 24}
            className={state === "locked" ? "opacity-40 grayscale" : ""}
            alt=""
          />
        ) : (
          <PixelIcon
            name="gem"
            size={big ? 34 : 24}
            className={state === "locked" ? "opacity-40 grayscale" : ""}
            alt=""
          />
        )}
      </div>
      <span
        className={`mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
          state === "locked" ? "bg-white/10 text-white/45" : "bg-gem text-white"
        }`}
      >
        Lv {level}
      </span>
    </div>
  );
}
