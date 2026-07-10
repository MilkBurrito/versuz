"use client";

// Campaign card: cream card with nested verse tiles + the boss row, which stays
// locked until EVERY campaign verse is added and at L3+ (§8), then turns gold
// and fightable. Copy says exactly what's missing.

import { useState } from "react";
import { GAME } from "@/config/game";
import type { CampaignDef, Tile } from "@/data/types";
import { levelFromXp } from "@/lib/engine/mastery";
import { useApp } from "@/state/store";
import { PixelIcon } from "@/components/ui/icons";
import { VerseTileRow } from "@/components/home/VerseTileRow";

export function CampaignCard({
  campaign,
  tiles,
  onTileTap,
}: {
  campaign: CampaignDef;
  tiles: Tile[]; // this user's tiles from this campaign
  onTileTap: (tileId: string) => void;
}) {
  const { startBoss, snapshot } = useApp();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const levels = new Map(
    tiles.map((t) => [t.verseId, levelFromXp(t.verseXp, t.masteryGoal)]),
  );
  const atL3 = campaign.verseIds.filter(
    (vid) => (levels.get(vid) ?? 0) >= GAME.boss.UNLOCK_MIN_LEVEL,
  ).length;
  const bossUnlocked = atL3 === campaign.verseIds.length;
  const cleared = snapshot?.userCampaigns.find((c) => c.campaignId === campaign.id)?.status;

  return (
    <section className="rounded-3xl bg-cream-card p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-1.5 py-1"
      >
        <span className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <span className={`text-[10px] ${open ? "" : "-rotate-90"} transition-transform`}>▼</span>
          {campaign.name} Campaign
        </span>
        <span className="rounded-xl bg-gold-wash px-2.5 py-1 text-[12px] font-extrabold text-gold-deep">
          {atL3}/{campaign.verseIds.length}
        </span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {tiles.map((tile) => (
            <VerseTileRow key={tile.id} tile={tile} onTap={() => onTileTap(tile.id)} />
          ))}
          {/* Boss row — fightable once the gate is open */}
          {bossUnlocked ? (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await startBoss(campaign.id);
                } catch {
                  // 0 energy — the status bar shows the regen timer
                } finally {
                  setBusy(false);
                }
              }}
              className="flex items-center justify-between rounded-2xl border-2 border-dashed border-gold bg-gold-wash px-3.5 py-3 transition-transform active:scale-[0.985]"
            >
              <span className="flex items-center gap-2 text-[13px] font-bold text-gold-deep">
                <PixelIcon name="boss-skull" size={20} />
                Boss · {campaign.bossName}
                {(cleared === "cleared" || cleared === "mastered") && " · cleared ✓"}
              </span>
              <span className="text-[11px] font-extrabold text-gold-deep">Fight · ⚡1</span>
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-shell-deep/40 bg-white/50 px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13px] font-bold text-ink-faint">
                <span className="opacity-60 grayscale">
                  <PixelIcon name="boss-skull" size={20} />
                </span>
                Boss · {campaign.bossName}
              </span>
              <span className="text-[11px] font-bold text-ink-faint">
                {atL3}/{campaign.verseIds.length} at L{GAME.boss.UNLOCK_MIN_LEVEL}+
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
