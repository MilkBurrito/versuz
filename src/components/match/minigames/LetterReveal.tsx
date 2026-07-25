"use client";

// §6.9 Letter Reveal — the gentlest recall game, for brand-new verses.
// The verse stays on screen with some words blanked; type a blank's FIRST
// LETTER and the whole word opens up. A wrong letter is a miss (same
// mistake-corrected shape as Mystery Word: keep trying, the round only
// completes when every blank is open).

import { useMemo, useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildLetterReveal } from "@/lib/engine/minigames";
import { TEXT } from "@/copy/strings";
import { ChunkContext, HintButton } from "./shared";

export function LetterReveal({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildLetterReveal(round));
  const blanks = useMemo(() => new Set(data.blankIndexes), [data]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);

  // The next blank awaiting a letter — the whole game is one focus point.
  const activeIndex = data.blankIndexes.find((i) => !open.has(i)) ?? null;

  function type(letter: string) {
    if (activeIndex === null) return;
    const expected = round.words[activeIndex]!.norm[0]!;
    if (letter.toLowerCase() === expected) {
      const next = new Set(open).add(activeIndex);
      setOpen(next);
      setWrong(null);
      if (next.size === blanks.size) onCheck(true); // all open → round won
    } else {
      setWrong(activeIndex);
      onCheck(false); // a miss costs HP, exactly like a wrong Mystery Word pick
    }
  }

  function reveal() {
    if (activeIndex === null) return;
    const next = new Set(open).add(activeIndex);
    setOpen(next);
    setWrong(null);
    if (next.size === blanks.size) onCheck(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <p className="font-serif text-[19px] leading-[2.1] text-ink">
          {round.words.map((w, i) => {
            if (!blanks.has(i) || open.has(i)) {
              return (
                <span
                  key={i}
                  className={`mx-0.5 inline-block ${
                    open.has(i) ? "font-bold text-gold-deep" : ""
                  }`}
                >
                  {w.display}
                </span>
              );
            }
            const isActive = i === activeIndex;
            const isWrong = wrong === i;
            return (
              <span
                key={i}
                className={`mx-0.5 inline-block min-w-10 border-b-2 text-center align-baseline ${
                  isWrong
                    ? "border-bad text-bad"
                    : isActive
                      ? "border-gold bg-gold-wash"
                      : "border-ink-faint/60"
                }`}
              >
                &nbsp;
              </span>
            );
          })}
        </p>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">{TEXT.match.letterRevealHelp}</p>
      </div>

      {/* One letter at a time: a tap pad beats summoning the OS keyboard for a
          single keystroke. Two dense rows so the verse keeps the screen. */}
      <div className="shrink-0 py-2">
        <div className="grid grid-cols-13 gap-1">
          {"abcdefghijklmnopqrstuvwxyz".split("").map((letter) => (
            <button
              key={letter}
              onClick={() => type(letter)}
              disabled={activeIndex === null}
              className="rounded-md border border-shell-deep/40 bg-white py-1.5 font-serif text-[13px] font-bold uppercase leading-none text-ink active:bg-shell disabled:opacity-40"
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <HintButton onHint={reveal} disabled={activeIndex === null} />
        </div>
      </div>
    </div>
  );
}
