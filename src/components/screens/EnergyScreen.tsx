"use client";

// Energy screen (from the status bar bolt): live segments + regen countdown
// and the §9.5 rules, stated plainly.

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";
import type { UserState } from "@/data/types";
import { energyAt, secondsToNextEnergy } from "@/lib/engine/energy";
import { PixelIcon } from "@/components/ui/icons";
import { formatEta } from "@/components/ui/StatusBar";
import { Card, InfoRow, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

export function EnergyScreen({ user, onClose }: { user: UserState; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const energy = energyAt(user.energy, now);
  const toNext = secondsToNextEnergy(user.energy, now);
  const regenHours = GAME.energy.REGEN_SECONDS / 3600;

  return (
    <OverlayShell title="Energy" subtitle="Your daily match budget" onClose={onClose}>
      <div className="flex flex-col items-center py-4">
        <div className="flex items-end gap-1.5">
          {Array.from({ length: GAME.energy.MAX }).map((_, i) => (
            <PixelIcon
              key={i}
              name="energy"
              size={44}
              className={i < energy.current ? "" : "opacity-25 grayscale"}
              alt=""
            />
          ))}
        </div>
        <div className="mt-3 text-[28px] font-extrabold leading-none text-ink">
          {energy.current} / {GAME.energy.MAX}
        </div>
        <div className="mt-1.5 text-[13px] font-bold text-ink-soft">
          {toNext === null ? "Full — go spend it" : `+1 in ${formatEta(toNext)}`}
        </div>
      </div>

      <SectionLabel>The rules</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow label="Starting a match costs" value={`${GAME.energy.COST_PER_MATCH} energy`} />
        <InfoRow label="Long or short verse" value="same cost" />
        <InfoRow label="Regenerates" value={`+1 every ~${regenHours}h`} />
        <InfoRow label="Empty to full" value="~24h" />
      </Card>

      <SectionLabel>Good to know</SectionLabel>
      <Card>
        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink-soft">
          <li>Energy is spent win or lose — it&apos;s the cost of an attempt.</li>
          <li>At 0 you can still read, add, and browse verses; only matches wait.</li>
          <li>
            Mastery takes more XP than a day&apos;s {GAME.energy.MAX} matches can give one verse —
            spreading practice across days is the efficient path.
          </li>
        </ul>
      </Card>
    </OverlayShell>
  );
}
