"use client";

// Gems screen (from the status bar gem): balance, how gems are earned, and the
// coming-soon shop teaser (§10-A: visible, not spendable in v1).

import Link from "next/link";
import { GAME } from "@/config/game";
import type { UserState } from "@/data/types";
import { PixelIcon } from "@/components/ui/icons";
import { Card, InfoRow, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

export function GemsScreen({ user, onClose }: { user: UserState; onClose: () => void }) {
  return (
    <OverlayShell title="Gems" subtitle="Earned by showing up — spending comes later" onClose={onClose}>
      <div className="flex flex-col items-center py-4">
        <PixelIcon name="gem" size={88} alt="Gems" />
        <div className="mt-1 text-[56px] font-extrabold leading-none text-gold-deep">
          {user.coins}
        </div>
        <div className="mt-1 text-[14px] font-bold text-ink">banked gems</div>
      </div>

      <SectionLabel>How you earn them</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow label="Win a versuz" value={`+${GAME.coins.PER_WIN}`} />
        <InfoRow label="Lose a versuz (you still showed up)" value={`+${GAME.coins.PER_LOSS}`} />
        <InfoRow label="Daily quests" value="soon" dim />
        <InfoRow label="Weekly quests" value="soon" dim />
      </Card>

      <SectionLabel>Spending them</SectionLabel>
      <Card>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          The Shop opens in a later update — your balance keeps growing until then. Meanwhile,
          weapons and gear unlock by clearing campaigns, leveling up, and finishing weekly quests.
        </p>
        <Link
          href="/shop"
          onClick={onClose}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-gold-wash py-2.5 text-[13px] font-extrabold text-gold-deep"
        >
          <PixelIcon name="nav-shop" size={20} alt="" /> Peek at the Shop
        </Link>
      </Card>
    </OverlayShell>
  );
}
