"use client";

// §6.2 Word Order: every word of the part, scrambled — rebuild the order.
// (Tap-to-place for skeleton parity; drag affordance is a polish pass.)

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildWordOrder } from "@/lib/engine/minigames";
import { CheckRow, ChipButton, ChunkContext, EmptySlot, PlacedChip, usePlacement } from "./shared";

export function WordOrder({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildWordOrder(round));
  const p = usePlacement(data.answers.map((w) => w.norm), data.bank);

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
              <PlacedChip key={i} word={data.bank[bankIndex]!} wrong={wrong} onClick={() => p.remove(i)} />
            );
          })}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 py-4">
        {data.bank.map((word, i) => (
          <ChipButton key={i} word={word} used={p.usedBankIndexes.has(i)} hinted={p.hintedBankIndex === i} onClick={() => p.place(i)} />
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
