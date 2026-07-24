"use client";

// §13-A persistent top status bar: profile · streak · coins · energy.
// Always visible on the hub + core screens (not on the match screen).

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";
import { energyAt, secondsToNextEnergy } from "@/lib/engine/energy";
import type { UserState } from "@/data/types";
import { LORE } from "@/lore/strings";
import { PixelIcon } from "@/components/ui/icons";
import { characterById } from "@/components/sprites/SpriteAnimator";

/* eslint-disable @next/next/no-img-element */

export type StatusScreen = "profile" | "streak" | "gems" | "energy";

export function StatusBar({
  user,
  onOpen,
}: {
  user: UserState;
  /** Each indicator opens its detail screen (Home wires this). */
  onOpen?: (screen: StatusScreen) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const energy = energyAt(user.energy, now);
  const toNext = secondsToNextEnergy(user.energy, now);

  return (
    <header className="sticky top-0 z-30 bg-shell/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button aria-label="Profile" className="active:scale-95" onClick={() => onOpen?.("profile")}>
          {/* the chosen hero's face IS the profile icon */}
          <img
            src={characterById(user.characterSprite).portrait}
            width={28}
            height={28}
            alt=""
            className="pixelated rounded-lg border border-black/10"
            draggable={false}
          />
        </button>
        <Stat
          icon={<PixelIcon name="streak" size={22} />}
          value={user.streakVisuals ? user.currentStreak : "—"}
          label={LORE.status.vigil}
          onTap={() => onOpen?.("streak")}
        />
        <Stat
          icon={<PixelIcon name="gem" size={22} />}
          value={user.coins}
          label={LORE.status.embers}
          onTap={() => onOpen?.("gems")}
        />
        <Stat
          icon={<PixelIcon name="energy" size={22} />}
          value={`${energy.current}`}
          label={toNext !== null ? LORE.status.lanternEta(formatEta(toNext)) : LORE.status.lantern}
          dim={energy.current === 0}
          onTap={() => onOpen?.("energy")}
        />
      </div>
    </header>
  );
}

function Stat({
  icon,
  value,
  label,
  dim,
  onTap,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  dim?: boolean;
  onTap?: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className={`flex items-center gap-1.5 active:scale-95 ${dim ? "text-ink-faint" : "text-ink-soft"}`}
      aria-label={`${label}: ${value}`}
      title={label}
    >
      {icon}
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </button>
  );
}

export function formatEta(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function maxEnergy(): number {
  return GAME.energy.MAX;
}
