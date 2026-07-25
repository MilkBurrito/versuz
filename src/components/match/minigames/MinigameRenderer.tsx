"use client";

// Dispatch a planned round to its minigame component. Each component reports
// every Check via onCheck(correct); the match shell owns HP + progression.

import type { MinigameRound } from "@/lib/engine/match";
import { FadingWords } from "./FadingWords";
import { FirstLetter } from "./FirstLetter";
import { LetterReveal } from "./LetterReveal";
import { PhraseBank } from "./PhraseBank";
import { MysteryWord } from "./MysteryWord";
import { RapidRecall } from "./RapidRecall";
import { Snowball } from "./Snowball";
import { SpotTheLie } from "./SpotTheLie";
import { WordBank } from "./WordBank";
import { WordOrder } from "./WordOrder";

export const MINIGAME_LABELS: Record<MinigameRound["type"], string> = {
  word_bank: "Word bank",
  first_letter: "First letter",
  word_order: "Word order",
  mystery_word: "Mystery word",
  fading_words: "Fading words",
  rapid_recall: "Rapid recall",
  spot_the_lie: "Spot the lie",
  snowball: "Snowball",
  letter_reveal: "Letter reveal",
  phrase_bank: "Phrase bank",
};

export function MinigameRenderer({
  round,
  translation,
  onCheck,
}: {
  round: MinigameRound;
  translation: string;
  onCheck: (correct: boolean) => void;
}) {
  switch (round.type) {
    case "word_bank":
      return <WordBank round={round} onCheck={onCheck} />;
    case "first_letter":
      return <FirstLetter round={round} onCheck={onCheck} />;
    case "word_order":
      return <WordOrder round={round} onCheck={onCheck} />;
    case "mystery_word":
      return <MysteryWord round={round} onCheck={onCheck} />;
    case "fading_words":
      return <FadingWords round={round} onCheck={onCheck} />;
    case "rapid_recall":
      return <RapidRecall round={round} translation={translation} onCheck={onCheck} />;
    case "spot_the_lie":
      return <SpotTheLie round={round} onCheck={onCheck} />;
    case "snowball":
      return <Snowball round={round} onCheck={onCheck} />;
    case "letter_reveal":
      return <LetterReveal round={round} onCheck={onCheck} />;
    case "phrase_bank":
      return <PhraseBank round={round} onCheck={onCheck} />;
  }
}
