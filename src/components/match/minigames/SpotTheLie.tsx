"use client";

// §6.7 Spot the Lie: the enemy lifted some words out of place. Tap two words
// to swap them, until the verse reads true again. How MANY words move scales
// with the verse level (GAME.spotTheLie.DISPLACED).

import { useState } from "react";
import { TEXT } from "@/copy/strings";
import type { MinigameRound } from "@/lib/engine/match";
import { buildSpotTheLie } from "@/lib/engine/minigames";
import { CheckRow, ChunkContext } from "./shared";
import { WordOrder } from "./WordOrder";

export function SpotTheLie({
  round,
  onCheck,
}: {
  round: MinigameRound;
  onCheck: (correct: boolean) => void;
}) {
  const [data] = useState(() => buildSpotTheLie(round));
  // No swappable pair (e.g. a chunk of all function words): fall back to Word Order.
  if (!data) return <WordOrder round={round} onCheck={onCheck} />;
  return (
    <SpotTheLieBoard
      round={round}
      initial={data.displayed.map((w) => w.display)}
      displacedCount={data.displaced.length}
      onCheck={onCheck}
    />
  );
}

function SpotTheLieBoard({
  round,
  initial,
  displacedCount,
  onCheck,
}: {
  round: MinigameRound;
  initial: string[];
  displacedCount: number;
  onCheck: (correct: boolean) => void;
}) {
  const [order, setOrder] = useState(initial); // current display order
  const [selected, setSelected] = useState<number | null>(null);
  const [checkedWrong, setCheckedWrong] = useState(false);
  const [hintOn, setHintOn] = useState(false); // hint: the out-of-place pair glows
  const truth = round.words.map((w) => w.display);
  const solved = order.join(" ") === truth.join(" ");

  function tap(i: number) {
    setCheckedWrong(false);
    if (selected === null) {
      setSelected(i);
    } else if (selected === i) {
      setSelected(null);
    } else {
      setOrder((prev) => {
        const next = [...prev];
        [next[selected], next[i]] = [next[i]!, next[selected]!];
        return next;
      });
      setSelected(null);
    }
  }

  function check() {
    const ok = order.join(" ") === truth.join(" ");
    setCheckedWrong(!ok);
    onCheck(ok);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <ChunkContext words={round.contextWords} />
        <p className="font-serif text-[19px] leading-[2.15] text-ink">
          {order.map((word, i) => (
            <button
              key={i}
              onClick={() => tap(i)}
              className={`mx-0.5 inline-block rounded-lg px-1 align-baseline font-serif text-[19px] transition-colors ${
                selected === i
                  ? "bg-gold-wash text-gold-deep ring-2 ring-gold"
                  : hintOn && word !== truth[i]
                    ? "vz-hint-glow bg-gold-wash text-gold-deep"
                    : checkedWrong && word !== truth[i]
                      ? "bg-bad-wash text-bad"
                      : "text-ink active:bg-shell"
              }`}
            >
              {word}
            </button>
          ))}
        </p>
        <p className="mt-3 text-[11px] font-bold text-ink-faint">
          {displacedCount > 2 ? TEXT.match.spotHelpMany(displacedCount) : TEXT.match.spotHelp}
        </p>
      </div>
      <CheckRow
        onCheck={check}
        label={checkedWrong ? "Check again" : "Check"}
        hintDisabled={hintOn || solved}
        onHint={() => setHintOn(true)}
      />
    </div>
  );
}
