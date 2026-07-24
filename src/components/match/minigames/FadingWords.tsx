"use client";

// §6.5 Fading Words: the part shows fully, then ~a third of its words fade;
// restore each faded word from the bank.

import { useEffect, useState } from "react";
import { LORE } from "@/lore/strings";
import type { MinigameRound } from "@/lib/engine/match";
import { buildFadingWords } from "@/lib/engine/minigames";
import { CheckRow, ChipButton, ChunkContext, usePlacement } from "./shared";

const READ_MS = 2600; // how long the full text shows before fading (tunable)

export function FadingWords({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildFadingWords(round));
  const [faded, setFaded] = useState(false);
  const answers = data.fadedIndexes.map((i) => round.words[i]!.norm);
  const p = usePlacement(answers, data.bank);

  useEffect(() => {
    const t = setTimeout(() => setFaded(true), READ_MS);
    return () => clearTimeout(t);
  }, []);

  // slot position within the faded sequence, by word index
  const slotOf = new Map(data.fadedIndexes.map((wordIdx, slotIdx) => [wordIdx, slotIdx]));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <p className="font-serif text-[19px] leading-[2.15] text-ink">
          {round.words.map((w, i) => {
            const slotIdx = slotOf.get(i);
            if (slotIdx === undefined || !faded) {
              return (
                <span
                  key={i}
                  className={`mx-0.5 inline-block transition-opacity duration-700 ${
                    slotIdx !== undefined && !faded ? "text-ink" : ""
                  }`}
                >
                  {w.display}
                </span>
              );
            }
            const bankIndex = p.slots[slotIdx];
            const wrong = p.wrongSlots.has(slotIdx);
            if (bankIndex === null || bankIndex === undefined) {
              return (
                <span
                  key={i}
                  className={`mx-0.5 inline-block min-w-12 border-b-2 align-baseline ${
                    wrong ? "border-bad" : "border-ink-faint/60"
                  }`}
                >
                  &nbsp;
                </span>
              );
            }
            return (
              <button
                key={i}
                onClick={() => p.remove(slotIdx)}
                className={`mx-0.5 inline-block rounded-lg border px-1.5 align-baseline font-serif text-[18px] ${
                  wrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 bg-shell/60 text-ink"
                }`}
              >
                {data.bank[bankIndex]}
              </button>
            );
          })}
        </p>
        {!faded && (
          <p className="mt-3 text-[11px] font-bold text-ink-faint">{LORE.match.fadingHelp}</p>
        )}
      </div>
      {faded && (
        <div className="flex flex-wrap justify-center gap-2 py-4">
          {data.bank.map((word, i) => (
            <ChipButton key={i} word={word} used={p.usedBankIndexes.has(i)} hinted={p.hintedBankIndex === i} onClick={() => p.place(i)} />
          ))}
        </div>
      )}
      <CheckRow
        checkDisabled={!faded || !p.allFilled}
        onCheck={() => onCheck(p.check())}
        label={p.checkedOnce && p.wrongSlots.size > 0 ? "Check again" : "Check"}
        hintDisabled={!faded || p.allFilled}
        onHint={p.hint}
      />
    </div>
  );
}
