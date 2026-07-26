"use client";

// §6.3 Mystery Word: one hidden word behind a glyph; pick from 4 options.
// A wrong pick costs HP (mistake-corrected: keep picking until right).

import { useState } from "react";
import type { MinigameRound } from "@/lib/engine/match";
import { buildMysteryWord } from "@/lib/engine/minigames";
import { playSfx } from "@/lib/audio/engine";
import { ChunkContext, HintButton } from "./shared";

export function MysteryWord({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildMysteryWord(round));
  const [struck, setStruck] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false); // hint: the answer glows
  const answer = round.words[data.hiddenIndex]!.norm;

  function pick(option: string) {
    playSfx("ui-click-battle");
    if (option === answer) {
      onCheck(true);
    } else {
      setStruck((prev) => new Set(prev).add(option));
      onCheck(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <p className="font-serif text-[19px] leading-[2.1] text-ink">
          {round.words.map((w, i) =>
            i === data.hiddenIndex ? (
              <span
                key={i}
                className="mx-1 inline-block rounded-lg bg-ink px-2.5 py-0.5 align-baseline text-[15px] text-white"
              >
                ◆
              </span>
            ) : (
              <span key={i} className="mx-0.5 inline-block">
                {w.display}
              </span>
            ),
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 py-4">
        {data.options.map((option) => {
          const dead = struck.has(option);
          const hinted = revealed && option === answer;
          return (
            <button
              key={option}
              disabled={dead}
              onClick={() => pick(option)}
              className={`rounded-2xl border-2 px-3 py-3.5 font-serif text-[17px] transition-colors ${
                dead
                  ? "border-bad/40 bg-bad-wash text-bad/50 line-through"
                  : hinted
                    ? "vz-hint-glow border-gold bg-gold-wash text-gold-deep"
                    : "border-shell-deep/40 bg-white text-ink active:bg-shell"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <HintButton onHint={() => setRevealed(true)} disabled={revealed} />
    </div>
  );
}
