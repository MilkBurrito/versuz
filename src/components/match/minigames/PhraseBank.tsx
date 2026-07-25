"use client";

// §6.10 Phrase Bank — Word Bank at phrase granularity. Chips carry whole
// phrases, so the word order INSIDE each chip is given to you; all you supply
// is the order of the phrases. Sits one rung below Word Bank on the ladder.

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildPhraseBank } from "@/lib/engine/minigames";
import { TEXT } from "@/copy/strings";
import { CheckRow, ChunkContext, usePlacement } from "./shared";

export function PhraseBank({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildPhraseBank(round));
  const p = usePlacement(data.answers, data.bank);

  return (
    <div className="flex h-full flex-col">
      {/* Slots AND bank share ONE scroll region: a long verse makes many
          phrases, and two competing flex children collapsed the slots. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <div className="flex flex-col gap-1.5">
          {data.answers.map((_, i) => {
            const bankIndex = p.slots[i];
            const wrong = p.wrongSlots.has(i);
            const filled = bankIndex !== null && bankIndex !== undefined;
            return (
              <button
                key={i}
                onClick={() => filled && p.remove(i)}
                className={`flex min-h-9 items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left font-serif text-[16px] leading-snug transition-colors ${
                  wrong
                    ? "border-bad bg-bad-wash text-bad"
                    : filled
                      ? "border-shell-deep/40 bg-shell/60 text-ink"
                      : "border-dashed border-ink-faint/50 bg-white"
                }`}
              >
                <span className="w-4 shrink-0 font-sans text-[10px] font-extrabold text-ink-faint">
                  {i + 1}
                </span>
                {filled ? data.bank[bankIndex]! : ""}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.bank.map((phrase, i) => {
            const used = p.usedBankIndexes.has(i);
            const hinted = p.hintedBankIndex === i;
            return (
              <button
                key={i}
                disabled={used}
                onClick={() => p.place(i)}
                className={`rounded-xl border-2 px-2.5 py-1.5 text-left font-serif text-[15px] leading-snug shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all active:translate-y-[1px] active:shadow-none ${
                  used
                    ? "border-shell bg-shell text-transparent shadow-none"
                    : hinted
                      ? "vz-hint-glow border-gold bg-gold-wash text-gold-deep"
                      : "border-shell-deep/40 bg-white text-ink"
                }`}
              >
                {phrase}
              </button>
            );
          })}
        </div>
        <p className="mb-2 mt-3 text-[11px] font-bold text-ink-faint">{TEXT.match.phraseBankHelp}</p>
      </div>

      <CheckRow
        checkDisabled={!p.allFilled}
        onCheck={() => onCheck(p.check())}
        label={p.checkedOnce && p.wrongSlots.size > 0 ? "Check again" : "Check"}
        hintDisabled={p.allFilled}
        onHint={p.hint}
      />
    </div>
  );
}
