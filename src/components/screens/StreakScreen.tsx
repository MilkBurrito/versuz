"use client";

// Streak screen (from the status bar flame): current + longest streak, the
// weekly auto-freeze, milestone markers, and how streaks work.

import { LORE } from "@/lore/strings";
import type { UserState } from "@/data/types";
import { PixelIcon } from "@/components/ui/icons";
import { Card, InfoRow, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

const MILESTONES = [7, 30, 100, 365];

export function StreakScreen({ user, onClose }: { user: UserState; onClose: () => void }) {
  return (
    <OverlayShell title={LORE.screens.vigil.title} subtitle={LORE.screens.vigil.subtitle} onClose={onClose}>
      <div className="flex flex-col items-center py-4">
        <PixelIcon name="streak" size={88} alt="Streak flame" />
        <div className="mt-1 text-[56px] font-extrabold leading-none text-gold-deep">
          {user.currentStreak}
        </div>
        <div className="mt-1 text-[14px] font-bold text-ink">
          {LORE.screens.vigil.unit(user.currentStreak)}
        </div>
      </div>

      <SectionLabel>Milestones</SectionLabel>
      <Card>
        <div className="flex items-center justify-between px-1 py-1.5">
          {MILESTONES.map((m) => {
            const lit = user.currentStreak >= m;
            return (
              <div key={m} className="flex flex-col items-center gap-1">
                <PixelIcon
                  name="streak"
                  size={34}
                  className={lit ? "" : "opacity-30 grayscale"}
                  alt=""
                />
                <span className={`text-[11px] font-extrabold ${lit ? "text-gold-deep" : "text-ink-faint"}`}>
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionLabel>Details</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow label={LORE.screens.vigil.longest} value={`${user.longestStreak} nights`} />
        <InfoRow
          label={LORE.screens.vigil.grace}
          value={
            user.streakFreezeAvailable ? (
              <span className="flex items-center gap-1.5 text-ok">
                <PixelIcon name="freeze" size={20} alt="" /> {LORE.screens.vigil.graceReady}
              </span>
            ) : (
              <span className="text-ink-faint">{LORE.screens.vigil.graceUsed}</span>
            )
          }
        />
        <InfoRow
          label={LORE.screens.vigil.today}
          value={
            user.lastStreakDate === todayStr() ? (
              <span className="text-ok">{LORE.screens.vigil.todaySecured}</span>
            ) : (
              <span className="text-gold-deep">{LORE.screens.vigil.todayPending}</span>
            )
          }
        />
      </Card>

      <SectionLabel>How it works</SectionLabel>
      <Card>
        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink-soft">
          {LORE.screens.vigil.how.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
    </OverlayShell>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
