// Button vocabulary: gold primary (Practice / Equip / Check), quiet outline,
// danger outline (delete), per the mockups' pill-shaped chunky buttons.

import type { ButtonHTMLAttributes } from "react";

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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
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
      onClick={onClick}
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
