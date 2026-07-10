"use client";

// §6.6 Rapid Recall: blank screen + the reference; type the whole verse.
// Normalized comparison with minor-typo tolerance (config).

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { rapidRecallMatches } from "@/lib/engine/minigames";
import { displayRef } from "@/lib/refs";
import { CheckButton } from "@/components/ui/Button";

export function RapidRecall({
  round,
  translation,
  onCheck,
}: {
  round: MinigameRound;
  translation: string;
  onCheck: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function check() {
    const ok = rapidRecallMatches(round.words, value);
    setWrong(!ok);
    onCheck(ok);
  }

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-faint">
        {displayRef(round.verseId)} — {translation}
      </p>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setWrong(false);
        }}
        placeholder="Type the whole verse from memory…"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`min-h-36 flex-1 resize-none rounded-2xl border-2 p-4 font-serif text-[17px] leading-relaxed outline-none ${
          wrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 focus:border-gold"
        }`}
      />
      {wrong && (
        <p className="mt-2 text-center text-[12px] font-bold text-bad">
          Not quite — small typos are forgiven, missing words are not.
        </p>
      )}
      <div className="pt-4">
        <CheckButton disabled={!value.trim()} onClick={check} label={wrong ? "Check again" : "Check"} />
      </div>
    </div>
  );
}
