"use client";

// Shared minigame plumbing: the tap-chips-into-slots state machine (Word Bank,
// Word Order, Snowball, Fading Words all use it) and the faded prior-part
// context block (rev 1: parts 2+ always show where the verse left off).

import { useState } from "react";
import type { Word } from "@/lib/engine/text";

export interface BankEntry {
  word: string;
}

export function usePlacement(answerNorms: string[], bankWords: string[]) {
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array(answerNorms.length).fill(null),
  );
  const [wrongSlots, setWrongSlots] = useState<Set<number>>(new Set());
  const [checkedOnce, setCheckedOnce] = useState(false);

  const usedBankIndexes = new Set(slots.filter((s): s is number => s !== null));
  const allFilled = slots.every((s) => s !== null);

  function place(bankIndex: number) {
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    const next = [...slots];
    next[firstEmpty] = bankIndex;
    setSlots(next);
    clearWrong(firstEmpty);
  }

  function remove(slotIndex: number) {
    if (slots[slotIndex] === null) return;
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
    clearWrong(slotIndex);
  }

  function clearWrong(slotIndex: number) {
    setWrongSlots((prev) => {
      if (!prev.has(slotIndex)) return prev;
      const next = new Set(prev);
      next.delete(slotIndex);
      return next;
    });
  }

  /** Returns true when fully correct; marks wrong slots otherwise. */
  function check(): boolean {
    const wrong = new Set<number>();
    slots.forEach((bankIndex, i) => {
      const placed = bankIndex === null ? null : bankWords[bankIndex]!;
      if (placed !== answerNorms[i]) wrong.add(i);
    });
    setCheckedOnce(true);
    setWrongSlots(wrong);
    return wrong.size === 0;
  }

  function reset(length: number) {
    setSlots(Array(length).fill(null));
    setWrongSlots(new Set());
    setCheckedOnce(false);
  }

  return { slots, wrongSlots, checkedOnce, usedBankIndexes, allFilled, place, remove, check, reset };
}

/** Faded prior parts of the verse — read where you left off, then continue. */
export function ChunkContext({ words }: { words: Word[] }) {
  if (words.length === 0) return null;
  return (
    <p className="mb-2 font-serif text-[16px] leading-relaxed text-ink-faint/80">
      {words.map((w) => w.display).join(" ")}
    </p>
  );
}

export function ChipButton({
  word,
  used,
  onClick,
}: {
  word: string;
  used: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={used}
      onClick={onClick}
      className={`rounded-xl border-2 px-3.5 py-2 font-serif text-[16px] shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all active:translate-y-[1px] active:shadow-none ${
        used
          ? "border-shell bg-shell text-transparent shadow-none"
          : "border-shell-deep/40 bg-white text-ink"
      }`}
    >
      {word}
    </button>
  );
}

export function PlacedChip({
  word,
  wrong,
  onClick,
}: {
  word: string;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mx-0.5 inline-block rounded-lg border px-1.5 align-baseline font-serif text-[18px] leading-relaxed ${
        wrong ? "border-bad bg-bad-wash text-bad" : "border-shell-deep/40 bg-shell/60 text-ink"
      }`}
    >
      {word}
    </button>
  );
}

export function EmptySlot({ wrong }: { wrong: boolean }) {
  return (
    <span
      className={`mx-0.5 inline-block min-w-14 border-b-2 align-baseline ${
        wrong ? "border-bad" : "border-ink-faint/60"
      }`}
    >
      &nbsp;
    </span>
  );
}
