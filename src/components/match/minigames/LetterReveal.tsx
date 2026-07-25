"use client";

// §6.9 Letter Reveal — the gentlest recall game, for brand-new verses.
// The verse stays on screen with some words blanked; type a blank's FIRST
// LETTER and the whole word opens up.
//
// INPUT: the caret sits IN the active blank — a one-character input that the
// real keyboard drives (physical on desktop, the OS keyboard on mobile). No
// on-screen letter pad; the blank moves along the verse as words open.
//
// A wrong letter is a miss — the same mistake-corrected shape as Mystery Word:
// keep trying, and the round only completes when every blank is open.

import { useEffect, useMemo, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The next blank awaiting a letter — the caret lives here.
  const activeIndex = data.blankIndexes.find((i) => !open.has(i)) ?? null;

  // Keep the caret in the blank as it moves down the verse.
  useEffect(() => {
    if (activeIndex !== null) inputRef.current?.focus();
  }, [activeIndex]);

  function accept(index: number) {
    const next = new Set(open).add(index);
    setOpen(next);
    setWrong(null);
    if (next.size === blanks.size) onCheck(true); // every blank open → round won
  }

  function type(raw: string) {
    if (activeIndex === null) return;
    const letter = raw.trim().slice(-1).toLowerCase();
    if (!letter) return;
    if (letter === round.words[activeIndex]!.norm[0]!) {
      accept(activeIndex);
    } else {
      setWrong(activeIndex);
      onCheck(false); // a miss costs HP, exactly like a wrong Mystery Word pick
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tapping anywhere in the verse brings the caret back. */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={() => inputRef.current?.focus()}
      >
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
            if (i === activeIndex) {
              // The caret sits in the blank itself.
              return (
                <input
                  key={i}
                  ref={inputRef}
                  value=""
                  onChange={(e) => type(e.target.value)}
                  aria-label={`Type the first letter of word ${i + 1}`}
                  autoFocus
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={1}
                  className={`mx-0.5 inline-block w-10 border-b-2 bg-gold-wash text-center align-baseline font-serif text-[19px] caret-gold-deep outline-none ${
                    wrong === i ? "border-bad text-bad" : "border-gold"
                  }`}
                />
              );
            }
            return (
              <span
                key={i}
                className="mx-0.5 inline-block min-w-10 border-b-2 border-ink-faint/60 text-center align-baseline"
              >
                &nbsp;
              </span>
            );
          })}
        </p>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">{TEXT.match.letterRevealHelp}</p>
      </div>

      <div className="shrink-0 py-2">
        <HintButton
          onHint={() => activeIndex !== null && accept(activeIndex)}
          disabled={activeIndex === null}
        />
      </div>
    </div>
  );
}
