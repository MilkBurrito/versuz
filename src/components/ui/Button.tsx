// Button vocabulary: gold primary (Practice / Equip / Check), quiet outline,
// danger outline (delete), per the mockups' pill-shaped chunky buttons.
//
// Every button clicks: routing the sound through here (rather than dozens of
// call sites) means any new button is audible for free.

"use client";

import { createContext, useContext, type ButtonHTMLAttributes } from "react";
import { playSfx } from "@/lib/audio/engine";

/**
 * True inside a fight (match, post-match, training session). Buttons there use
 * the brighter "positive" click; CHECK deliberately keeps the plain click so
 * committing an answer stays audibly distinct from everything else.
 */
export const BattleClickContext = createContext(false);

/** The click a plain button should make, given where it lives. */
export function useClickSound(): () => void {
  const inBattle = useContext(BattleClickContext);
  return () => playSfx(inBattle ? "ui-click-battle" : "ui-click");
}

type Variant = "primary" | "outline" | "danger" | "info";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-soft via-gold to-gold-deep text-gold-dark border-2 border-gold-deep shadow-[0_3px_0_rgba(109,79,16,0.35)] active:translate-y-[2px] active:shadow-none",
  outline:
    "bg-white text-ink-soft border-2 border-shell-deep/50 active:bg-shell",
  danger:
    "bg-white text-bad border-2 border-bad/50 active:bg-bad-wash",
  info:
    "bg-white text-battle border-2 border-battle/50 active:bg-battle/5",
};

export function Button({
  variant = "primary",
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const click = useClickSound();
  return (
    <button
      {...props}
      onClick={(e) => {
        click();
        onClick?.(e);
      }}
      className={`rounded-2xl px-5 py-3 text-[15px] font-bold transition-transform disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0_rgba(109,79,16,0.35)] ${styles[variant]} ${className}`}
    />
  );
}

/** The big match-screen submit. One action, one name: CHECK. */
export function CheckButton({
  disabled,
  onClick,
  label = "Check",
}: {
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => {
        playSfx("ui-click");
        onClick?.();
      }}
      disabled={disabled}
      className={`w-full rounded-2xl py-4 text-[16px] font-extrabold uppercase tracking-widest transition-all ${
        disabled
          ? "bg-shell text-ink-faint"
          : "bg-gradient-to-b from-gold-soft via-gold to-gold-deep text-gold-dark border-2 border-gold-deep shadow-[0_4px_0_rgba(109,79,16,0.35)] active:translate-y-[3px] active:shadow-none"
      }`}
    >
      {label}
    </button>
  );
}
