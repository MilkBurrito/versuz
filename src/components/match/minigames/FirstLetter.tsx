"use client";

// §6.1 First Letter — v1.0 interaction restored: each word is an input box with
// its first letter as the PLACEHOLDER; the user types the whole word ("for",
// not "or"), and space/Enter jumps the caret to the next box.
// Capitalization/punctuation auto-handled (compared on normalized forms).

import { useRef, useState } from "react";
import { TEXT } from "@/copy/strings";
import type { MinigameRound } from "@/lib/engine/match";
import { normalizeWord } from "@/lib/engine/text";
import { CheckRow, ChunkContext } from "./shared";

export function FirstLetter({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const answers = round.words;
  const [values, setValues] = useState<string[]>(() => Array(answers.length).fill(""));
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [checkedOnce, setCheckedOnce] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const allFilled = values.every((v) => v.trim() !== "");

  function setValue(i: number, v: string) {
    setValues((prev) => prev.map((x, j) => (j === i ? v : x)));
    setWrong((prev) => {
      if (!prev.has(i)) return prev;
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
  }

  function check() {
    const bad = new Set<number>();
    answers.forEach((w, i) => {
      if (normalizeWord(values[i]!) !== w.norm) bad.add(i);
    });
    setCheckedOnce(true);
    setWrong(bad);
    onCheck(bad.size === 0);
  }

  const solved = answers.every((w, i) => normalizeWord(values[i]!) === w.norm);

  /** Hint: fill the first empty-or-incorrect box, then move the caret on. */
  function hint() {
    const i = answers.findIndex((w, idx) => normalizeWord(values[idx]!) !== w.norm);
    if (i === -1) return;
    setValue(i, answers[i]!.norm);
    const next = inputRefs.current[i + 1];
    if (next && values[i + 1] === "") next.focus();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <div className="flex flex-wrap gap-x-2 gap-y-2.5">
          {answers.map((w, i) => {
            const isWrong = wrong.has(i);
            return (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                value={values[i]}
                onChange={(e) => setValue(i, e.target.value)}
                onKeyDown={(e) => {
                  // v1.0 behavior: space (or Enter) hops to the next word's box;
                  // backspace in an EMPTY box retreats to the previous one.
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    inputRefs.current[i + 1]?.focus();
                  } else if (e.key === "Backspace" && values[i] === "") {
                    e.preventDefault();
                    const prev = inputRefs.current[i - 1];
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
                // typed — with the border-box padding+border (20px) added on
                // top of the ch measure so serif words never clip.
                style={{
                  width: `calc(${Math.max(3, Math.max(w.norm.length, values[i]!.length) + 2)}ch + 24px)`,
                }}
                className={`rounded-xl border-2 px-2 py-2 text-center font-serif text-[17px] outline-none transition-colors placeholder:font-semibold placeholder:text-ink-faint focus:border-gold ${
                  isWrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 bg-white text-ink"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">
          {TEXT.match.firstLetterHelp}
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
