"use client";

// §6.4 Verse Builder (Word Bank): blanks + bank (answers + decoys).

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildWordBank } from "@/lib/engine/minigames";
import { CheckRow, ChipButton, ChunkContext, EmptySlot, PlacedChip, usePlacement } from "./shared";

export function WordBank({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildWordBank(round));
  const bankWords = data.bank.map((b) => b.word);
  const p = usePlacement(data.answers.map((w) => w.norm), bankWords);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <p className="font-serif text-[19px] leading-[2.15] text-ink">
          {data.answers.map((_, i) => {
            const bankIndex = p.slots[i];
            const wrong = p.wrongSlots.has(i);
            return bankIndex === null || bankIndex === undefined ? (
              <EmptySlot key={i} wrong={wrong} />
            ) : (
              <PlacedChip key={i} word={bankWords[bankIndex]!} wrong={wrong} onClick={() => p.remove(i)} />
            );
          })}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 py-4">
        {data.bank.map((entry, i) => (
          <ChipButton key={i} word={entry.word} used={p.usedBankIndexes.has(i)} hinted={p.hintedBankIndex === i} onClick={() => p.place(i)} />
        ))}
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
