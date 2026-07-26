"use client";

// v1.2 conditional post-match sequence: Victory → XP → [Streak first-today] →
// [Chest when something unlocked] → Home. Separate tap-through beats, never an
// empty one. Loss is its own gentle screen; abandon skips all of this.
// Boss wins route through the same beats with campaign rewards.

import { useEffect, useState } from "react";
import { GAME } from "@/config/game";
import type { MatchSession } from "@/state/store";
import { useApp } from "@/state/store";
import { displayRef } from "@/lib/refs";
import { TEXT } from "@/copy/strings";
import { levelProgress } from "@/lib/engine/mastery";
import { BattleClickContext, Button } from "@/components/ui/Button";
import { XPBar } from "@/components/ui/Bars";
import { PixelIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { playSfx } from "@/lib/audio/engine";
import { castForMatch, matchTag } from "@/components/match/MatchScreen";

export function PostMatch({ match }: { match: MatchSession }) {
  const { advancePost, exitPostMatch, startPractice, snapshot } = useApp();
  const step = match.postSteps[match.postIndex];

  // Each beat announces itself as it lands.
  useEffect(() => {
    if (step === "xp") playSfx("reward-xp");
    else if (step === "chest") playSfx("reward-ember");
  }, [step]);
  const settle = match.settle;
  // Same fighters the match showed (casting is deterministic per match id).
  const hero = characterById(snapshot?.user.characterSprite);
  const { enemy: beaten } = castForMatch(match, matchTag(match));
  const clearedCampaignTheme = settle?.campaign
    ? snapshot?.campaigns.find((c) => c.id === settle.campaign!.campaignId)?.theme ?? "default"
    : "default";

  if (step === "loss") {
    return (
      <LossScreen
        match={match}
        onRetry={() => match.tileId && startPractice(match.tileId)}
        onHome={exitPostMatch}
        hasEnergy={(snapshot?.user.energy.current ?? 0) >= GAME.energy.COST_PER_MATCH}
      />
    );
  }
  if (!settle) return null;

  return (
    <BattleClickContext.Provider value={true}>
    <button
      onClick={advancePost}
      className="fixed inset-0 z-[60] flex w-full flex-col items-center justify-center bg-cream px-8 text-center"
    >
      {step === "victory" && (
        <div className="vz-pop flex flex-col items-center">
          <div className="flex items-end gap-2">
            <div className="flex w-[130px] justify-center overflow-visible">
              <SpriteAnimator sprite={hero.sprite} anim="idle" size={hero.battleSize} playKey={1} />
            </div>
            <div className="flex w-[120px] justify-center overflow-visible opacity-50">
              <SpriteAnimator
                sprite={beaten.sprite}
                anim="death"
                size={Math.round(beaten.displayH * 0.85)}
                flip={beaten.flip}
                playKey={1}
              />
            </div>
          </div>
          <h1 className="mt-4 text-[30px] font-extrabold text-ink">
            {match.plan.isBoss
              ? TEXT.postMatch.bossVictoryTitle(match.bossName ?? "The Stronghold")
              : TEXT.postMatch.victoryTitle}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {match.plan.isBoss ? TEXT.postMatch.bossVictorySub : TEXT.postMatch.victorySub}
          </p>
          {settle.xp.perfectBonus > 0 && (
            <span className="mt-3 rounded-full bg-gold-wash px-3 py-1 text-[12px] font-bold text-gold-deep">
              {TEXT.postMatch.flawless}
            </span>
          )}
        </div>
      )}

      {step === "xp" && (
        <div className="vz-rise w-full max-w-xs">
          <div className="text-[52px] font-extrabold text-gold-deep">+{settle.playerXpDelta}</div>
          <div className="text-[12px] font-bold uppercase tracking-widest text-ink-faint">
            {TEXT.postMatch.xpEarned}
          </div>
          <div className="mt-5 rounded-2xl bg-white p-4 text-left text-[13px] shadow-sm">
            {match.plan.isBoss ? (
              <>
                <Row label="Boss defeated" value={GAME.player.BOSS_DEFEAT_XP} gold />
                {settle.campaign?.cleared && (
                  <Row label="Campaign cleared" value={GAME.player.CAMPAIGN_CLEARED_XP} gold />
                )}
              </>
            ) : (
              <>
                <Row label="Base" value={settle.xp.base} />
                {settle.xp.perfectBonus > 0 && (
                  <Row label="Flawless +50%" value={settle.xp.perfectBonus} gold />
                )}
                {settle.xp.restedBonus > 0 && (
                  <Row label="Rested +25%" value={settle.xp.restedBonus} gold />
                )}
                {settle.xp.timerBonus > 0 && (
                  <Row
                    label={TEXT.postMatch.timerBonusRow(
                      settle.xp.timerBonus / GAME.xp.TIMER_BONUS_XP,
                    )}
                    value={settle.xp.timerBonus}
                    gold
                  />
                )}
                {settle.xp.diminishingModifier < 1 && (
                  <Row
                    label={`Practiced again today ×${settle.xp.diminishingModifier}`}
                    value={
                      settle.xp.awarded -
                      Math.round(
                        settle.xp.base +
                          settle.xp.perfectBonus +
                          settle.xp.restedBonus +
                          settle.xp.timerBonus,
                      )
                    }
                    dim
                  />
                )}
              </>
            )}
            <div className="mt-2 flex justify-between border-t border-black/5 pt-2 font-extrabold">
              <span>Total</span>
              <span>{settle.playerXpDelta}</span>
            </div>
          </div>
          {settle.tile && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-ink-soft">
                <span>
                  {displayRef(tileVerseId(match, settle.tile.id))} · {match.translation}
                </span>
                <span className={settle.tile.level > match.verseLevel ? "text-gold-deep" : ""}>
                  {settle.tile.level > match.verseLevel
                    ? `L${match.verseLevel} → L${settle.tile.level} ↑`
                    : `L${settle.tile.level}`}
                </span>
              </div>
              <XPBar fraction={levelProgress(settle.tile.verseXp, settle.tile.masteryGoal)} />
            </div>
          )}
        </div>
      )}

      {step === "streak" && (
        <div className="vz-pop flex flex-col items-center">
          <PixelIcon name="lantern" size={80} alt="Streak lantern" />
          <div className="mt-2 text-[44px] font-extrabold text-gold-deep">
            {settle.streak.count}
          </div>
          <div className="text-[15px] font-bold text-ink">{TEXT.postMatch.streakDay(settle.streak.count)}</div>
          <p className="mt-2 text-[12px] text-ink-faint">{TEXT.postMatch.streakSecured}</p>
        </div>
      )}

      {step === "chest" && (
        <ChestStep
          mastered={settle.tile?.mastered ?? false}
          campaignCleared={settle.campaign?.cleared ?? false}
          campaignTheme={clearedCampaignTheme}
          playerLeveledUp={settle.player.leveledUp}
          playerLevel={settle.player.level}
        />
      )}

      <span className="absolute bottom-8 left-0 right-0 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
        {TEXT.postMatch.tapToContinue}
      </span>
    </button>
    </BattleClickContext.Provider>
  );
}

function tileVerseId(match: MatchSession, tileId: string): string {
  const tile = useApp.getState().snapshot?.tiles.find((t) => t.id === tileId);
  return tile?.verseId ?? match.plan.finisher.verseId;
}

function Row({ label, value, gold, dim }: { label: string; value: number; gold?: boolean; dim?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${gold ? "text-gold-deep" : dim ? "text-ink-faint" : "text-ink-soft"}`}>
      <span>{label}</span>
      <span className="font-bold">{value > 0 && gold ? `+${value}` : value}</span>
    </div>
  );
}

function ChestStep({
  mastered,
  campaignCleared,
  campaignTheme,
  playerLeveledUp,
  playerLevel,
}: {
  mastered: boolean;
  campaignCleared: boolean;
  campaignTheme: string;
  playerLeveledUp: boolean;
  playerLevel: number;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <span
        role="button"
        className="vz-pop flex flex-col items-center"
        onClick={(e) => {
          e.stopPropagation();
          playSfx("reward-ember");
          setOpen(true);
        }}
      >
        <PixelIcon name="chest" size={72} alt="Reward chest" />
        <span className="mt-2 text-[16px] font-extrabold text-ink">{TEXT.postMatch.chestDropped}</span>
        <span className="mt-1 text-[12px] text-ink-faint">{TEXT.postMatch.chestOpen}</span>
      </span>
    );
  }
  // Reward icons come from the Raven badge picks (the same badge lands on Profile).
  const [icon, title, sub] = campaignCleared
    ? [`badge-${campaignTheme}`, "Campaign cleared", "Badge earned + reward cosmetic in your equip slots"]
    : mastered
      ? ["badge-mastered", "Verse mastered — golden badge earned", "+500 player XP"]
      : playerLeveledUp
        ? ["badge-level", `Player Level ${playerLevel} reached`, "New unlocks in your equip slots"]
        : ["gem", "Reward unlocked", ""];
  return (
    <div className="vz-pop flex flex-col items-center">
      <PixelIcon name={icon} size={72} alt="" />
      <span className="mt-2 text-[16px] font-extrabold text-gold-deep">{title}</span>
      {sub && <span className="mt-1 text-[12px] text-ink-faint">{sub}</span>}
    </div>
  );
}

function LossScreen({
  match,
  onRetry,
  onHome,
  hasEnergy,
}: {
  match: MatchSession;
  onRetry: () => void;
  onHome: () => void;
  hasEnergy: boolean;
}) {
  const hero = characterById(useApp.getState().snapshot?.user.characterSprite);
  return (
    <BattleClickContext.Provider value={true}>
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-cream px-8 text-center">
      <div className="flex w-[140px] justify-center overflow-visible">
        <SpriteAnimator sprite={hero.sprite} anim="hit" size={hero.battleSize} playKey={1} />
      </div>
      <h1 className="mt-4 text-[24px] font-extrabold text-ink">
        {match.plan.isBoss
          ? TEXT.postMatch.bossLossTitle(match.bossName ?? "The Darkness")
          : TEXT.postMatch.lossTitle}
      </h1>
      <p className="mt-1 text-[14px] text-ink-soft">{TEXT.postMatch.lossSub}</p>
      <div className="mt-5 space-y-1 text-[12px] font-bold">
        <p className="text-ink-faint">
          {TEXT.postMatch.lossConsolation(match.settle?.playerXpDelta ?? GAME.xp.LOSS_CONSOLATION_PLAYER_XP)}
        </p>
        <p className="text-ink-faint">{TEXT.postMatch.lossNoMastery}</p>
        {match.settle?.streak.firstMatchToday && <p className="text-ok">{TEXT.postMatch.streakKept}</p>}
      </div>
      <div className="mt-7 flex gap-3">
        {match.tileId && (
          <Button variant="outline" onClick={onRetry} disabled={!hasEnergy}>
            {TEXT.postMatch.retry} · ⚡{GAME.energy.COST_PER_MATCH}
          </Button>
        )}
        <Button onClick={onHome}>{TEXT.postMatch.home}</Button>
      </div>
    </div>
    </BattleClickContext.Provider>
  );
}
