"use client";

// Shared minigame plumbing: the tap-chips-into-slots state machine (Word Bank,
// Word Order, Snowball, Fading Words all use it), the faded prior-part
// context block (rev 1: parts 2+ always show where the verse left off), and
// the hint affordance (reveal the next correct answer for an energy point).

import { createContext, useContext, useState } from "react";
import { GAME } from "@/config/game";
import { useApp } from "@/state/store";
import { TEXT } from "@/copy/strings";
import type { Word } from "@/lib/engine/text";
import { CheckButton } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/icons";
import { playSfx } from "@/lib/audio/engine";

export interface BankEntry {
  word: string;
}

interface PlacementBoard {
  slots: (number | null)[];
  wrong: Set<number>;
  // Hint: the bank chip that fills the next empty slot glows until placed.
  hintedBankIndex: number | null;
}

export function usePlacement(answerNorms: string[], bankWords: string[]) {
  // One state object updated functionally: rapid taps (which React batches)
  // must each see the latest slots, never a stale closure.
  const [board, setBoard] = useState<PlacementBoard>(() => ({
    slots: Array(answerNorms.length).fill(null),
    wrong: new Set(),
    hintedBankIndex: null,
  }));
  const [checkedOnce, setCheckedOnce] = useState(false);

  const { slots, wrong: wrongSlots, hintedBankIndex } = board;
  const usedBankIndexes = new Set(slots.filter((s): s is number => s !== null));
  const allFilled = slots.every((s) => s !== null);

  function place(bankIndex: number) {
    setBoard((prev) => {
      if (prev.slots.includes(bankIndex)) return prev;
      const firstEmpty = prev.slots.findIndex((s) => s === null);
      if (firstEmpty === -1) return prev;
      const nextSlots = [...prev.slots];
      nextSlots[firstEmpty] = bankIndex;
      const nextWrong = new Set(prev.wrong);
      nextWrong.delete(firstEmpty);
      return {
        slots: nextSlots,
        wrong: nextWrong,
        hintedBankIndex: prev.hintedBankIndex === bankIndex ? null : prev.hintedBankIndex,
      };
    });
  }

  /** Point the hint glow at the chip belonging in the first empty slot. */
  function hint() {
    setBoard((prev) => {
      const firstEmpty = prev.slots.findIndex((s) => s === null);
      if (firstEmpty === -1) return prev;
      const target = answerNorms[firstEmpty]!;
      const used = new Set(prev.slots);
      const idx = bankWords.findIndex((w, i) => w === target && !used.has(i));
      return idx === -1 ? prev : { ...prev, hintedBankIndex: idx };
    });
  }

  function remove(slotIndex: number) {
    setBoard((prev) => {
      if (prev.slots[slotIndex] === null) return prev;
      const nextSlots = [...prev.slots];
      nextSlots[slotIndex] = null;
      const nextWrong = new Set(prev.wrong);
      nextWrong.delete(slotIndex);
      return { ...prev, slots: nextSlots, wrong: nextWrong };
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
    setBoard((prev) => ({ ...prev, wrong }));
    return wrong.size === 0;
  }

  function reset(length: number) {
    setBoard({ slots: Array(length).fill(null), wrong: new Set(), hintedBankIndex: null });
    setCheckedOnce(false);
  }

  return { slots, wrongSlots, checkedOnce, usedBankIndexes, allFilled, hintedBankIndex, place, remove, hint, check, reset };
}

/**
 * Waystation drills wrap minigames in this context: Counsel is freely given
 * there (zero economy — nothing at the Waystation costs or grants anything).
 */
export const FreeDrillContext = createContext(false);

/**
 * The Counsel affordance: reveal the next correct answer for a lantern flame.
 * In a real Stand the spend goes through the authority (same pool as match
 * starts) and `onHint` runs only when it was affordable; in a free drill it
 * simply runs.
 */
export function HintButton({
  onHint,
  disabled = false,
}: {
  onHint: () => void;
  disabled?: boolean;
}) {
  const { snapshot, spendHint } = useApp();
  const free = useContext(FreeDrillContext);
  const [busy, setBusy] = useState(false);
  const energy = snapshot?.user.energy.current ?? 0;
  const canAfford = free || energy >= GAME.hints.ENERGY_COST;
  async function click() {
    if (busy) return;
    playSfx("ui-click-battle");
    if (free) {
      onHint();
      return;
    }
    setBusy(true);
    try {
      if (await spendHint()) {
        playSfx("spend"); // energy left the pouch
        onHint();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={() => void click()}
      disabled={disabled || !canAfford || busy}
      title={canAfford ? TEXT.match.hintTitle(GAME.hints.ENERGY_COST) : TEXT.match.hintEmpty}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 px-4 text-[13px] font-extrabold uppercase tracking-wide transition-all ${
        disabled || !canAfford || busy
          ? "border-shell bg-shell text-ink-faint"
          : "border-shell-deep/50 bg-white text-ink-soft active:bg-shell"
      }`}
    >
      {TEXT.match.hint}
      {!free && (
        <span className="flex items-center gap-0.5 text-[12px] normal-case tracking-normal">
          −{GAME.hints.ENERGY_COST}
          <PixelIcon name="energy" size={15} alt="lantern" />
        </span>
      )}
    </button>
  );
}

/** Check + Hint side by side — the standard bottom row of every minigame. */
export function CheckRow({
  checkDisabled,
  onCheck,
  label,
  hintDisabled,
  onHint,
}: {
  checkDisabled?: boolean;
  onCheck: () => void;
  label: string;
  hintDisabled?: boolean;
  onHint: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <HintButton onHint={onHint} disabled={hintDisabled} />
      <div className="min-w-0 flex-1">
        <CheckButton disabled={checkDisabled} onClick={onCheck} label={label} />
      </div>
    </div>
  );
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
  hinted = false,
  onClick,
}: {
  word: string;
  used: boolean;
  /** Hint glow: this chip is the next one to click. */
  hinted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={used}
      onClick={() => {
        playSfx("ui-click-battle");
        onClick();
      }}
      className={`rounded-xl border-2 px-3.5 py-2 font-serif text-[16px] shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all active:translate-y-[1px] active:shadow-none ${
        used
          ? "border-shell bg-shell text-transparent shadow-none"
          : hinted
            ? "vz-hint-glow border-gold bg-gold-wash text-gold-deep"
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
      onClick={() => {
        playSfx("ui-click-battle");
        onClick();
      }}
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
