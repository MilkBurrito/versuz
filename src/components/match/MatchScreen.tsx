"use client";

// §5 themed match shell over a parallax scene. The hero WALKS IN at match
// start (layers drift only during the walk-in), then the fight begins:
// correct Check → the hero's attacks cycle atk1→atk2→atk3 and each plays OUT
// IN FULL before the next minigame appears (input gated meanwhile); wrong →
// take-hit; the finisher lands with sp_atk. Enemy + environment come from the
// casting rules (themed verses fixed, others per-match rotation).

import { useEffect, useRef, useState } from "react";
import type { MatchSession } from "@/state/store";
import { useApp } from "@/state/store";
import type { ThemeTag } from "@/config/game";
import { castBoss, castEnemy, castEnvironment } from "@/config/casting";
import type { Enemy } from "@/config/enemies";
import { displayRef } from "@/lib/refs";
import { TEXT } from "@/copy/strings";
import { EnemyHpBar, PlayerHpBar } from "@/components/ui/Bars";
import { Button } from "@/components/ui/Button";
import { Nameplate } from "@/components/ui/Nameplate";
import { CloseIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Parallax } from "@/components/match/Parallax";
import { Finisher } from "@/components/match/Finisher";
import { RoundTimer } from "@/components/match/RoundTimer";
import { PostMatch } from "@/components/match/PostMatch";
import { MINIGAME_LABELS, MinigameRenderer } from "@/components/match/minigames/MinigameRenderer";

const WALK_IN_MS = 1600;
const ATTACK_CYCLE = ["atk1", "atk2", "atk3"] as const;

/** Resolve the fighters + scene for a session (shared with PostMatch). */
export function castForMatch(match: MatchSession, tag: ThemeTag): { enemy: Enemy; env: ReturnType<typeof castEnvironment> } {
  const enemy = match.plan.isBoss
    ? castBoss(match.matchId, match.bossCampaignId)
    : castEnemy(match.matchId, tag, match.verseLevel);
  return { enemy, env: castEnvironment(match.matchId, tag) };
}

/** Theme tag driving casting: the tile's tag, or the boss campaign's theme. */
export function matchTag(match: MatchSession): ThemeTag {
  const snap = useApp.getState().snapshot;
  if (match.bossCampaignId) {
    return snap?.campaigns.find((c) => c.id === match.bossCampaignId)?.theme ?? "default";
  }
  return snap?.tiles.find((t) => t.id === match.tileId)?.tag ?? "default";
}

interface HeroAnimState {
  anim: string;
  key: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MatchScreen({ match }: { match: MatchSession }) {
  const { reportRound, reportFinisher, abandonMatch, snapshot } = useApp();
  // Walk-in entrance runs unless the user prefers reduced motion.
  const [entering, setEntering] = useState(() => !prefersReducedMotion());
  const [heroAnim, setHeroAnim] = useState<HeroAnimState>(() => ({
    anim: prefersReducedMotion() ? "idle" : "run",
    key: 0,
  }));
  const [enemyAnim, setEnemyAnim] = useState<HeroAnimState>({ anim: "idle", key: 0 });
  // While the hero's attack plays out, input is gated and rounds don't advance.
  const [acting, setActing] = useState(false);
  const [atkCount, setAtkCount] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [shake, setShake] = useState<"hero" | "enemy" | null>(null);
  // SpriteAnimator's onEnd resolves to whatever attack is currently in flight
  // (a ref, so re-renders during the ~2s playback can't drop the handler).
  const heroAttackDoneRef = useRef<(() => void) | null>(null);
  // Bonus clock (see GAME.timers): a lapse costs NOTHING, it just forfeits the
  // bonus, so this is a ref — no re-render, no interaction with HP.
  const clockLapsedRef = useRef(false);
  // Watchdog: if onEnd somehow never arrives, the match must not stay gated.
  const attackWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (attackWatchdogRef.current) clearTimeout(attackWatchdogRef.current);
    };
  }, []);

  const hero = characterById(snapshot?.user.characterSprite);
  const tag = matchTag(match);
  const { enemy, env } = castForMatch(match, tag);

  // Walk-in entrance: run anim + drifting layers, then settle to idle.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => {
      setEntering(false);
      setHeroAnim((s) => ({ anim: "idle", key: s.key + 1 }));
    }, WALK_IN_MS);
    return () => clearTimeout(t);
  }, []);

  if (match.phase === "post") return <PostMatch match={match} />;

  const enemyRemaining = match.plan.enemyHp - match.roundIndex;
  const enemyDead = match.phase === "finisher";
  const round = match.plan.rounds[Math.min(match.roundIndex, match.plan.rounds.length - 1)]!;

  function playHeroAttack(anim: string, after: () => void) {
    setActing(true);
    setHeroAnim((s) => ({ anim, key: s.key + 1 }));
    heroAttackDoneRef.current = () => {
      heroAttackDoneRef.current = null; // idempotent — watchdog + onEnd can't double-fire
      if (attackWatchdogRef.current) clearTimeout(attackWatchdogRef.current);
      setActing(false);
      setHeroAnim((s) => ({ anim: "idle", key: s.key + 1 }));
      after();
    };
    const def = hero.sprite.anims[anim];
    const playbackMs = def ? (def.frames / def.fps) * 1000 : 2000;
    attackWatchdogRef.current = setTimeout(
      () => heroAttackDoneRef.current?.(),
      playbackMs + 2000,
    );
  }

  function onRoundCheck(correct: boolean) {
    if (acting) return;
    if (correct) {
      const beatClock = round.timerSeconds !== null && !clockLapsedRef.current;
      const anim = ATTACK_CYCLE[atkCount % ATTACK_CYCLE.length]!;
      setAtkCount((n) => n + 1);
      const isLastHp = enemyRemaining <= 1;
      setEnemyAnim((s) => ({ anim: "hurt", key: s.key + 1 }));
      setShake("enemy");
      setTimeout(() => setShake(null), 450);
      playHeroAttack(anim, () => {
        setEnemyAnim((s) => ({ anim: isLastHp ? "death" : "idle", key: s.key + 1 }));
        clockLapsedRef.current = false; // fresh clock for the next round
        reportRound(true, beatClock);
      });
    } else {
      setHeroAnim((s) => ({ anim: "hit", key: s.key + 1 }));
      setEnemyAnim((s) => ({ anim: "attack", key: s.key + 1 }));
      setShake("hero");
      setTimeout(() => {
        setShake(null);
        setHeroAnim((s) => ({ anim: "idle", key: s.key + 1 }));
        setEnemyAnim((s) => ({ anim: "idle", key: s.key + 1 }));
      }, 600);
      reportRound(false);
    }
  }

  function onFinish(correct: boolean) {
    if (acting) return;
    if (correct) {
      // The finishing blow — sp_atk plays out in full, then the match settles.
      playHeroAttack("sp_atk", () => void reportFinisher(true));
    } else {
      void reportFinisher(false);
    }
  }

  return (
    // Full-bleed surface above every overlay (campaign detail, add sheets are z-50).
    <div className="fixed inset-0 z-[60] flex flex-col overflow-x-clip bg-white">
      {/* --- battle scene --- */}
      <div className="relative w-full shrink-0 pb-9 pt-[calc(env(safe-area-inset-top)+8px)]">
        <Parallax env={env} scrolling={entering} />
        {/* readability scrim behind the HP chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" />

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="relative flex items-start gap-3 px-4">
            <button
              aria-label="Exit match"
              onClick={() => setConfirmExit(true)}
              className="mt-0.5 rounded-full p-1.5 text-white/90 active:bg-white/10"
            >
              <CloseIcon size={18} />
            </button>
            <div className="flex-1 pr-2">
              <EnemyHpBar total={match.plan.enemyHp} remaining={Math.max(0, enemyRemaining)} />
              <p className="mt-1 text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {match.bossName ?? enemy.name}
              </p>
            </div>
          </div>

          <div className="relative mt-3 flex items-end justify-between px-6" style={{ minHeight: hero.battleSize }}>
            {/* hero — narrow anchor, wide 288px frames overflow visibly */}
            <div className={entering ? "vz-walk-in" : shake === "hero" ? "vz-shake" : ""}>
              <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
                <SpriteAnimator
                  sprite={hero.sprite}
                  anim={heroAnim.anim}
                  size={hero.battleSize}
                  playKey={heroAnim.key}
                  onEnd={() => heroAttackDoneRef.current?.()}
                />
              </div>
              <div className="-mt-1 flex justify-center" style={{ width: 120 }}>
                <PlayerHpBar total={match.plan.playerHp} filled={match.playerHp} />
              </div>
            </div>
            {/* enemy */}
            <div
              className={`${shake === "enemy" ? "vz-shake" : ""} ${enemyDead ? "opacity-40" : ""}`}
            >
              <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
                <SpriteAnimator
                  sprite={enemy.sprite}
                  anim={enemyDead ? "death" : enemyAnim.anim}
                  size={enemy.displayH}
                  flip={enemy.flip}
                  playKey={enemyAnim.key}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- reference nameplate bridging the seam (hidden on the finisher) --- */}
      <div className="relative z-10 -mt-5 flex w-full shrink-0 justify-center">
        {match.phase !== "finisher" ? (
          <Nameplate>
            {displayRef(round.verseId)} {match.translation}
          </Nameplate>
        ) : (
          <span className="rounded-full border-2 border-gold bg-gold-wash px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-wide text-gold-deep">
            {TEXT.match.finisherLabel}
          </span>
        )}
      </div>

      {/* --- minigame sheet (input gated while an attack plays out) --- */}
      <div className="min-h-0 w-full flex-1 overflow-hidden bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] pt-4">
        <div
          className={`mx-auto flex h-full min-h-0 w-full max-w-xl flex-col px-5 transition-opacity ${
            acting || entering ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {match.phase === "playing" ? (
            <>
              {round.timerSeconds !== null && (
                <div className="mb-2 shrink-0">
                  <RoundTimer
                    key={`clock-${match.roundIndex}`}
                    seconds={round.timerSeconds}
                    paused={acting || entering}
                    onExpire={() => {
                      clockLapsedRef.current = true;
                    }}
                  />
                </div>
              )}
              <p className="mb-2 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                {MINIGAME_LABELS[round.type]} · {match.roundIndex + 1}/{match.plan.rounds.length}
                {round.chunk ? ` · Part ${round.chunk.index} of ${round.chunk.total}` : ""}
              </p>
              <div className="min-h-0 flex-1">
                <MinigameRenderer
                  key={match.roundIndex}
                  round={round}
                  translation={match.translation}
                  onCheck={onRoundCheck}
                />
              </div>
            </>
          ) : (
            <Finisher
              verseId={match.plan.finisher.verseId}
              mode={match.plan.finisher.mode}
              onFinish={onFinish}
            />
          )}
        </div>
      </div>

      {/* --- exit confirm --- */}
      {confirmExit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-8">
          <div className="vz-pop w-full max-w-xs rounded-3xl bg-white p-5 text-center">
            <h2 className="text-[16px] font-extrabold text-ink">{TEXT.match.exitTitle}</h2>
            <p className="mt-1.5 text-[13px] text-ink-soft">{TEXT.match.exitBody}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmExit(false)}>
                {TEXT.match.exitStay}
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => void abandonMatch()}>
                {TEXT.match.exitLeave}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
