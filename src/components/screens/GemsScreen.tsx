"use client";

// Gems screen (from the status bar gem): balance, how gems are earned, and the
// coming-soon shop teaser (§10-A: visible, not spendable in v1).

import Link from "next/link";
import { GAME } from "@/config/game";
import { LORE } from "@/lore/strings";
import type { UserState } from "@/data/types";
import { PixelIcon } from "@/components/ui/icons";
import { Card, InfoRow, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

export function GemsScreen({ user, onClose }: { user: UserState; onClose: () => void }) {
  return (
    <OverlayShell title={LORE.screens.embers.title} subtitle={LORE.screens.embers.subtitle} onClose={onClose}>
      <div className="flex flex-col items-center py-4">
        <PixelIcon name="gem" size={88} alt="Gems" />
        <div className="mt-1 text-[56px] font-extrabold leading-none text-gold-deep">
          {user.coins}
        </div>
        <div className="mt-1 text-[14px] font-bold text-ink">{LORE.screens.embers.unit}</div>
      </div>

      <SectionLabel>{LORE.screens.embers.earnHeading}</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow label={LORE.screens.embers.win} value={`+${GAME.coins.PER_WIN}`} />
        <InfoRow label={LORE.screens.embers.loss} value={`+${GAME.coins.PER_LOSS}`} />
        <InfoRow label="Daily quests" value="soon" dim />
        <InfoRow label="Weekly quests" value="soon" dim />
      </Card>

      <SectionLabel>{LORE.screens.embers.spendHeading}</SectionLabel>
      <Card>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {LORE.screens.embers.spendBody}
        </p>
        <Link
          href="/shop"
          onClick={onClose}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-gold-wash py-2.5 text-[13px] font-extrabold text-gold-deep"
        >
          <PixelIcon name="nav-shop" size={20} alt="" /> {LORE.screens.embers.peek}
        </Link>
      </Card>
    </OverlayShell>
  );
}
