"use client";

// §6.1 First Letter — v1.0 interaction restored: each word is an input box with
// its first letter as the PLACEHOLDER; the user types the whole word ("for",
// not "or"), and space/Enter jumps the caret to the next box.
// Capitalization/punctuation auto-handled (compared on normalized forms).

import { useRef, useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { normalizeWord } from "@/lib/engine/text";
import { CheckButton } from "@/components/ui/Button";
import { ChunkContext } from "./shared";

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
                  // v1.0 behavior: space (or Enter) hops to the next word's box.
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    inputRefs.current[i + 1]?.focus();
                  }
                }}
                placeholder={w.display[0]}
                aria-label={`Word ${i + 1}, starts with ${w.display[0]}`}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                size={Math.max(3, w.norm.length)}
                style={{ width: `${Math.max(3, w.norm.length + 1)}ch` }}
                className={`rounded-xl border-2 px-2 py-2 text-center font-serif text-[17px] outline-none transition-colors placeholder:font-semibold placeholder:text-ink-faint focus:border-gold ${
                  isWrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 bg-white text-ink"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">
          Type each whole word — space jumps to the next box.
        </p>
      </div>
      <CheckButton
        disabled={!allFilled}
        onClick={check}
        label={checkedOnce && wrong.size > 0 ? "Check again" : "Check"}
      />
    </div>
  );
}
