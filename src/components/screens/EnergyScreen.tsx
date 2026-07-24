"use client";

// Energy screen (from the status bar bolt): live segments + regen countdown
// and the §9.5 rules, stated plainly.

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";
import { TEXT } from "@/copy/strings";
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
    <OverlayShell title={TEXT.screens.energy.title} subtitle={TEXT.screens.energy.subtitle} onClose={onClose}>
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
          {toNext === null ? TEXT.screens.energy.full : TEXT.screens.energy.next(formatEta(toNext))}
        </div>
      </div>

      <SectionLabel>{TEXT.screens.energy.rulesHeading}</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow
          label={TEXT.screens.energy.costLabel}
          value={TEXT.screens.energy.costValue(GAME.energy.COST_PER_MATCH)}
        />
        <InfoRow label={TEXT.screens.energy.sameCostLabel} value={TEXT.screens.energy.sameCostValue} />
        <InfoRow label={TEXT.screens.energy.regenLabel} value={TEXT.screens.energy.regenValue(regenHours)} />
        <InfoRow label={TEXT.screens.energy.refillLabel} value={TEXT.screens.energy.refillValue} />
      </Card>

      <SectionLabel>{TEXT.screens.energy.notesHeading}</SectionLabel>
      <Card>
        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink-soft">
          {TEXT.screens.energy.notes.map((line: string) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
    </OverlayShell>
  );
}
