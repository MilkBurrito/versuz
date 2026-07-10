"use client";

// §6.8 Snowball: cumulative clause drilling. Everything built so far sits on
// screen as the running start; build the next clause from its scrambled words.
// The whole snowball is ONE round (one enemy HP segment); wrong checks still
// cost player HP via onCheck(false).

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildSnowballSegments, shuffle } from "@/lib/engine/minigames";
import type { Word } from "@/lib/engine/text";
import { CheckButton } from "@/components/ui/Button";
import { ChipButton, ChunkContext, EmptySlot, PlacedChip, usePlacement } from "./shared";

export function Snowball({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [segments] = useState(() => buildSnowballSegments(round.words));
  const [segIndex, setSegIndex] = useState(0);
  return (
    <SnowballSegment
      key={segIndex}
      round={round}
      segments={segments}
      segIndex={segIndex}
      onSegmentDone={() => {
        if (segIndex + 1 >= segments.length) onCheck(true);
        else setSegIndex(segIndex + 1);
      }}
      onMistake={() => onCheck(false)}
    />
  );
}

function SnowballSegment({
  round,
  segments,
  segIndex,
  onSegmentDone,
  onMistake,
}: {
  round: MinigameRound;
  segments: Word[][];
  segIndex: number;
  onSegmentDone: () => void;
  onMistake: () => void;
}) {
  const segment = segments[segIndex]!;
  const built = segments.slice(0, segIndex).flat();
  const [bank] = useState(() => {
    let b = shuffle(segment.map((w) => w.norm), Math.random);
    if (b.join(" ") === segment.map((w) => w.norm).join(" ") && b.length > 1)
      b = [...b.slice(1), b[0]!];
    return b;
  });
  const p = usePlacement(segment.map((w) => w.norm), bank);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        Snowball · clause {segIndex + 1} of {segments.length}
      </p>
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={[...round.contextWords, ...built]} />
        <p className="font-serif text-[19px] leading-[2.15] text-ink">
          {segment.map((_, i) => {
            const bankIndex = p.slots[i];
            const wrong = p.wrongSlots.has(i);
            return bankIndex === null || bankIndex === undefined ? (
              <EmptySlot key={i} wrong={wrong} />
            ) : (
              <PlacedChip key={i} word={bank[bankIndex]!} wrong={wrong} onClick={() => p.remove(i)} />
            );
          })}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 py-4">
        {bank.map((word, i) => (
          <ChipButton key={i} word={word} used={p.usedBankIndexes.has(i)} onClick={() => p.place(i)} />
        ))}
      </div>
      <CheckButton
        disabled={!p.allFilled}
        onClick={() => {
          if (p.check()) onSegmentDone();
          else onMistake();
        }}
        label={p.checkedOnce && p.wrongSlots.size > 0 ? "Check again" : "Check"}
      />
    </div>
  );
}
