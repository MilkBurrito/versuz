"use client";

// Campaign detail (full-screen): roster with per-verse status, add individually
// or all at once, and the boss row — locked until every campaign verse is added
// AND at L3+ (§8), with copy that says exactly what's missing.

import { useState } from "react";
import { GAME } from "@/config/game";
import type { CampaignDef } from "@/data/types";
import { levelFromXp } from "@/lib/engine/mastery";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import { displayRef } from "@/lib/refs";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { CloseIcon, LockIcon, SwordIcon } from "@/components/ui/icons";
import { SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { castBoss } from "@/config/casting";
import { AddVerseSheet } from "@/components/explore/AddVerseSheet";

export function CampaignDetail({
  campaign,
  onClose,
}: {
  campaign: CampaignDef;
  onClose: () => void;
}) {
  const { snapshot, addCampaign, startBoss } = useApp();
  const [addSheet, setAddSheet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bossError, setBossError] = useState<string | null>(null);
  if (!snapshot) return null;

  // Progress pills read from ANY tile holding the verse (standalone included);
  // the campaign itself only counts as added when every verse is campaign-flagged.
  const anyTileByVerse = new Map(snapshot.tiles.map((t) => [t.verseId, t]));
  const campaignTiles = snapshot.tiles.filter((t) => t.addedFromCampaignId === campaign.id);
  const fullyAdded = campaign.verseIds.every((vid) =>
    campaignTiles.some((t) => t.verseId === vid),
  );
  const atL3 = campaign.verseIds.filter((vid) => {
    const t = campaignTiles.find((x) => x.verseId === vid);
    return t !== undefined && levelFromXp(t.verseXp, t.masteryGoal) >= GAME.boss.UNLOCK_MIN_LEVEL;
  });
  const bossUnlocked = fullyAdded && atL3.length === campaign.verseIds.length;
  const playerLevel = playerLevelFromXp(snapshot.user.playerXp);
  const levelLocked = playerLevel < campaign.requiredPlayerLevel;
  const cleared = snapshot.userCampaigns.find((c) => c.campaignId === campaign.id)?.status;

  async function addAll() {
    setBusy(true);
    try {
      await addCampaign(campaign.id); // adopts standalone tiles, creates the rest
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      <div className="w-full bg-[#5b5f68] pb-4 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label="Back" className="rounded-full p-2 text-white/85 active:bg-white/10">
              <CloseIcon size={20} />
            </button>
            <div>
              <h2 className="text-[16px] font-extrabold text-white">{campaign.name}</h2>
              <p className="text-[11px] font-bold text-white/70">{campaign.description}</p>
            </div>
          </div>
          {!fullyAdded && !levelLocked && (
            <button
              onClick={addAll}
              disabled={busy}
              className="rounded-full border border-white/40 px-3 py-1.5 text-[11px] font-extrabold text-white active:bg-white/10"
            >
              Add campaign
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-xl">
          {levelLocked && (
            <p className="mb-3 rounded-2xl bg-white px-4 py-3 text-[12px] font-bold text-ink-soft">
              <LockIcon size={14} className="mr-1 inline text-ink-faint" /> Unlocks at Player Level{" "}
              {campaign.requiredPlayerLevel}.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {campaign.verseIds.map((vid) => {
              const tile = anyTileByVerse.get(vid);
              const level = tile ? levelFromXp(tile.verseXp, tile.masteryGoal) : null;
              const standalone = tile !== undefined && tile.addedFromCampaignId !== campaign.id;
              return (
                <div
                  key={vid}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                >
                  <span className="font-serif text-[15px] text-ink">
                    {displayRef(vid)}
                    {standalone && (
                      <span className="ml-2 align-middle font-sans text-[9px] font-extrabold uppercase tracking-wide text-ink-faint">
                        on your shelf
                      </span>
                    )}
                  </span>
                  {tile === undefined ? (
                    <button
                      disabled={levelLocked}
                      onClick={() => setAddSheet(vid)}
                      className="rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-40"
                    >
                      + Add
                    </button>
                  ) : level! >= 7 ? (
                    <span className="rounded-full bg-gold-wash px-3 py-1 text-[11px] font-extrabold text-gold-deep">
                      ★ mastered
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                        level! >= GAME.boss.UNLOCK_MIN_LEVEL
                          ? "bg-ok-wash text-ok"
                          : "bg-shell text-ink-soft"
                      }`}
                    >
                      L{level}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* boss row */}
          <div
            className={`mt-4 rounded-2xl border-2 border-dashed px-4 py-4 ${
              bossUnlocked ? "border-gold bg-gold-wash" : "border-shell-deep/40 bg-white/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex w-[56px] justify-center overflow-visible">
                  <SpriteAnimator sprite={castBoss(campaign.id, campaign.id).sprite} anim="idle" size={54} flip />
                </div>
                <div>
                  <p className={`text-[14px] font-extrabold ${bossUnlocked ? "text-gold-deep" : "text-ink-faint"}`}>
                    Boss · {campaign.bossName}
                  </p>
                  <p className="text-[11px] font-bold text-ink-faint">
                    {cleared === "cleared" || cleared === "mastered"
                      ? "Cleared ✓ — rematch any time"
                      : bossUnlocked
                        ? "The gate is open."
                        : !fullyAdded
                          ? "Add the whole campaign to face the boss"
                          : `${atL3.length}/${campaign.verseIds.length} at L${GAME.boss.UNLOCK_MIN_LEVEL}+ — keep practicing`}
                  </p>
                </div>
              </div>
              {bossUnlocked ? (
                <Button
                  className="px-4 py-2 text-[13px]"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setBossError(null);
                    try {
                      await startBoss(campaign.id);
                    } catch (e) {
                      setBossError(
                        e instanceof Error && e.message === "no_energy"
                          ? "No energy — it refills over time."
                          : "Couldn't start the boss fight.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <SwordIcon size={15} className="mr-1 inline" /> Fight · ⚡1
                </Button>
              ) : (
                <LockIcon size={20} className="text-ink-faint" />
              )}
            </div>
            {bossError && <p className="mt-2 text-[11px] font-bold text-bad">{bossError}</p>}
          </div>
        </div>
      </div>

      {/* Individual adds land STANDALONE on Home (theme tag only, no grouping). */}
      {addSheet && (
        <AddVerseSheet verseId={addSheet} tag={campaign.theme} onClose={() => setAddSheet(null)} />
      )}
    </div>
  );
}
