"use client";

// §6.1 First Letter — v1.0 interaction: each blanked word is an input box with
// its first letter as the PLACEHOLDER; you type the whole word ("for", not
// "or"), and space/Enter jumps to the next box. Capitalization/punctuation are
// auto-handled (compared on normalized forms).
//
// DIFFICULTY: only a share of the words are blanked at low verse levels — the
// rest are spelled out as context (GAME.firstLetter.BLANK_FRACTION). At the
// hardest tier the whole chunk is blanked, which is the original game.

import { useMemo, useRef, useState } from "react";
import { TEXT } from "@/copy/strings";
import type { MinigameRound } from "@/lib/engine/match";
import { buildFirstLetter } from "@/lib/engine/minigames";
import { normalizeWord } from "@/lib/engine/text";
import { CheckRow, ChunkContext } from "./shared";

export function FirstLetter({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [selection] = useState(() => buildFirstLetter(round));
  const blanks = useMemo(() => selection.blankIndexes, [selection]);
  // word index → blank slot, so render stays pure (no counter mutation).
  const slotOf = useMemo(
    () => new Map(blanks.map((wordIdx, slot) => [wordIdx, slot])),
    [blanks],
  );
  // Values are keyed by BLANK ORDER, not by word index.
  const [values, setValues] = useState<string[]>(() => Array(blanks.length).fill(""));
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [checkedOnce, setCheckedOnce] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = values.every((v) => v.trim() !== "");

  function setValue(slot: number, v: string) {
    setValues((prev) => prev.map((x, j) => (j === slot ? v : x)));
    setWrong((prev) => {
      if (!prev.has(slot)) return prev;
      const next = new Set(prev);
      next.delete(slot);
      return next;
    });
  }

  function check() {
    const bad = new Set<number>();
    blanks.forEach((wordIdx, slot) => {
      if (normalizeWord(values[slot]!) !== round.words[wordIdx]!.norm) bad.add(slot);
    });
    setCheckedOnce(true);
    setWrong(bad);
    onCheck(bad.size === 0);
  }

  const solved = blanks.every(
    (wordIdx, slot) => normalizeWord(values[slot]!) === round.words[wordIdx]!.norm,
  );

  /** Hint: fill the first empty-or-incorrect box, then move the caret on. */
  function hint() {
    const slot = blanks.findIndex(
      (wordIdx, s) => normalizeWord(values[s]!) !== round.words[wordIdx]!.norm,
    );
    if (slot === -1) return;
    setValue(slot, round.words[blanks[slot]!]!.norm);
    const next = inputRefs.current[slot + 1];
    if (next && values[slot + 1] === "") next.focus();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        {/* Inline flow: spelled-out words share the line with the boxes, so a
            partial round reads as a verse with gaps rather than a form. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 font-serif text-[17px] leading-[2] text-ink">
          {round.words.map((w, i) => {
            const slot = slotOf.get(i);
            if (slot === undefined) {
              return (
                <span key={i} className="text-ink-soft">
                  {w.display}
                </span>
              );
            }
            const isWrong = wrong.has(slot);
            return (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[slot] = el;
                }}
                value={values[slot]}
                onChange={(e) => setValue(slot, e.target.value)}
                onKeyDown={(e) => {
                  // v1.0 behavior: space (or Enter) hops to the next box;
                  // backspace in an EMPTY box retreats to the previous one.
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    inputRefs.current[slot + 1]?.focus();
                  } else if (e.key === "Backspace" && values[slot] === "") {
                    e.preventDefault();
                    const prev = inputRefs.current[slot - 1];
                    if (prev) {
                      prev.focus();
                      prev.setSelectionRange(prev.value.length, prev.value.length);
                    }
                  }
                }}
                placeholder={w.display[0]}
                aria-label={`Word ${i + 1}, starts with ${w.display[0]}`}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                size={Math.max(3, w.norm.length)}
                // Sized to whichever is longer — the answer or what's actually
                // typed — with the border-box padding+border added on top of the
                // ch measure so serif words never clip.
                style={{
                  width: `calc(${Math.max(3, Math.max(w.norm.length, values[slot]!.length) + 2)}ch + 24px)`,
                }}
                className={`rounded-xl border-2 px-2 py-1.5 text-center font-serif text-[17px] outline-none transition-colors placeholder:font-semibold placeholder:text-ink-faint focus:border-gold ${
                  isWrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 bg-white text-ink"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">
          {blanks.length < round.words.length
            ? TEXT.match.firstLetterPartialHelp
            : TEXT.match.firstLetterHelp}
        </p>
      </div>
      <CheckRow
        checkDisabled={!allFilled}
        onCheck={check}
        label={checkedOnce && wrong.size > 0 ? "Check again" : "Check"}
        hintDisabled={solved}
        onHint={hint}
      />
    </div>
  );
}
