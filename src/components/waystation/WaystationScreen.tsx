"use client";

// THE WAYSTATION (Build Brief Phase 3) — endless practice that cannot touch
// the schedule or the economy, by construction:
//
//   · Only already-learned verses are offered (practiceCount > 0 — the verse
//     has been through at least one real Stand, so the scheduler owns it).
//   · Nothing here calls startMatch/settleMatch/reportRound — the authority
//     never hears about a drill. No lantern, no faithfulness, no embers, no
//     vigil, no mastery. Cosmetic session accuracy only.
//   · The opponent is the Pell — inert wood at a rest place, not Darkness
//     (Axiom III). Counsel is freely given here (FreeDrillContext).
//
// Rounds reuse the real minigame components against a locally built plan;
// finishing a plan simply builds a fresh one — loop as long as you like.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/state/store";
import type { Tile } from "@/data/types";
import type { EnvMeta } from "@/config/environments.generated";
import { getVerseText } from "@/lib/bible/client";
import { buildMatchPlan, type MatchPlan } from "@/lib/engine/match";
import { levelFromXp } from "@/lib/engine/mastery";
import { displayRef } from "@/lib/refs";
import { LORE } from "@/lore/strings";
import { PELL_DISPLAY_H, PELL_SPRITE, WAYSTATION_ENVS } from "@/config/waystation";
import { Button } from "@/components/ui/Button";
import { Nameplate } from "@/components/ui/Nameplate";
import { CloseIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Parallax } from "@/components/match/Parallax";
import { FreeDrillContext } from "@/components/match/minigames/shared";
import { MINIGAME_LABELS, MinigameRenderer } from "@/components/match/minigames/MinigameRenderer";

const ATTACK_CYCLE = ["atk1", "atk2", "atk3"] as const;

export function WaystationScreen({ onClose }: { onClose: () => void }) {
  const { snapshot } = useApp();
  // Drillable = verses the scheduler already owns (been through a real Stand).
  const drillable = useMemo(
    () => (snapshot?.tiles ?? []).filter((t) => t.practiceCount > 0),
    [snapshot],
  );
  const [tile, setTile] = useState<Tile | null>(null);
  const [env] = useState(
    () => WAYSTATION_ENVS[Math.floor(Math.random() * WAYSTATION_ENVS.length)]!,
  );

  if (tile) {
    return <Drill tile={tile} env={env} onBack={() => setTile(null)} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-x-clip bg-white">
      <Scene env={env} onClose={onClose}>
        <div style={{ minHeight: 165 }} className="mt-3 flex items-end justify-center px-6">
          <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
            <SpriteAnimator sprite={PELL_SPRITE} anim="idle" size={PELL_DISPLAY_H} />
          </div>
        </div>
      </Scene>
      <div className="relative z-10 -mt-5 flex w-full shrink-0 justify-center">
        <Nameplate>{LORE.waystation.pell}</Nameplate>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
        <div className="mx-auto w-full max-w-xl px-5">
          <p className="text-center text-[13px] leading-relaxed font-bold text-ink-soft">
            {LORE.waystation.intro}
          </p>
          {drillable.length === 0 ? (
            <>
              <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-faint">
                {LORE.waystation.noVerses}
              </p>
              <Button variant="outline" className="mx-auto mt-6 block" onClick={onClose}>
                {LORE.waystation.leave}
              </Button>
            </>
          ) : (
            <>
              <p className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
                {LORE.waystation.chooseVerse}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setTile(drillable[Math.floor(Math.random() * drillable.length)]!)}
                >
                  {LORE.waystation.anyVerse}
                </Button>
                {drillable.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTile(t)}
                    className="flex items-center justify-between rounded-2xl border-2 border-shell-deep/40 bg-white px-4 py-3 text-left active:bg-shell"
                  >
                    <span className="text-[15px] font-bold text-ink">
                      {displayRef(t.verseId)}{" "}
                      <span className="text-[11px] font-bold text-ink-faint">{t.translation}</span>
                    </span>
                    <span className="text-[11px] font-extrabold text-ink-faint">
                      L{levelFromXp(t.verseXp, t.masteryGoal)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-5 text-center text-[11px] font-bold text-ink-faint">
                {LORE.waystation.empty}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Scene({
  env,
  onClose,
  children,
}: {
  env: EnvMeta;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full shrink-0 pb-9 pt-[calc(env(safe-area-inset-top)+8px)]">
      <Parallax env={env} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between px-4">
          <button
            aria-label={LORE.waystation.leave}
            onClick={onClose}
            className="mt-0.5 rounded-full p-1.5 text-white/90 active:bg-white/10"
          >
            <CloseIcon size={18} />
          </button>
          <p className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {LORE.waystation.title}
          </p>
          <span className="w-8" />
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface AnimState {
  anim: string;
  key: number;
}

function Drill({ tile, env, onBack }: { tile: Tile; env: EnvMeta; onBack: () => void }) {
  const { snapshot } = useApp();
  const hero = characterById(snapshot?.user.characterSprite);
  const [plan, setPlan] = useState<MatchPlan | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [loop, setLoop] = useState(0); // bumps rebuild fresh plans
  const [heroAnim, setHeroAnim] = useState<AnimState>({ anim: "idle", key: 0 });
  const [pellAnim, setPellAnim] = useState<AnimState>({ anim: "idle", key: 0 });
  const [acting, setActing] = useState(false);
  const [atkCount, setAtkCount] = useState(0);
  const [strikes, setStrikes] = useState({ hit: 0, total: 0 });
  const heroDoneRef = useRef<(() => void) | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A fresh plan per loop — the drill never talks to the authority.
  useEffect(() => {
    let alive = true;
    getVerseText(tile.verseId, tile.translation).then((text) => {
      if (!alive) return;
      const level = levelFromXp(tile.verseXp, tile.masteryGoal);
      setPlan(buildMatchPlan(tile.verseId, text, level));
      setRoundIndex(0);
    });
    return () => {
      alive = false;
    };
  }, [tile, loop]);

  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const onCheck = useCallback(
    (correct: boolean) => {
      if (acting || !plan) return;
      setStrikes((s) => ({ hit: s.hit + (correct ? 1 : 0), total: s.total + 1 }));
      if (!correct) return; // no stakes — the minigame shows the miss, nothing else happens
      const anim = ATTACK_CYCLE[atkCount % ATTACK_CYCLE.length]!;
      setAtkCount((n) => n + 1);
      setActing(true);
      setHeroAnim((s) => ({ anim, key: s.key + 1 }));
      setPellAnim((s) => ({ anim: "hit", key: s.key + 1 }));
      heroDoneRef.current = () => {
        heroDoneRef.current = null;
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setActing(false);
        setHeroAnim((s) => ({ anim: "idle", key: s.key + 1 }));
        setPellAnim((s) => ({ anim: "idle", key: s.key + 1 }));
        if (roundIndex + 1 >= plan.rounds.length) {
          setLoop((n) => n + 1); // seamless: a fresh plan, keep drilling
        } else {
          setRoundIndex((i) => i + 1);
        }
      };
      const def = hero.sprite.anims[anim];
      const playbackMs = def ? (def.frames / def.fps) * 1000 : 2000;
      watchdogRef.current = setTimeout(() => heroDoneRef.current?.(), playbackMs + 2000);
    },
    [acting, plan, atkCount, roundIndex, hero],
  );

  const round = plan?.rounds[Math.min(roundIndex, (plan?.rounds.length ?? 1) - 1)];
  const accuracy = strikes.total === 0 ? null : Math.round((strikes.hit / strikes.total) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-x-clip bg-white">
      <Scene env={env} onClose={onBack}>
        <div
          className="relative mt-1 flex items-end justify-between px-6"
          style={{ minHeight: hero.battleSize }}
        >
          <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
            <SpriteAnimator
              sprite={hero.sprite}
              anim={heroAnim.anim}
              size={hero.battleSize}
              playKey={heroAnim.key}
              onEnd={() => heroDoneRef.current?.()}
            />
          </div>
          <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
            <SpriteAnimator
              sprite={PELL_SPRITE}
              anim={pellAnim.anim}
              size={PELL_DISPLAY_H}
              playKey={pellAnim.key}
            />
          </div>
        </div>
      </Scene>

      <div className="relative z-10 -mt-5 flex w-full shrink-0 justify-center">
        <Nameplate>
          {displayRef(tile.verseId)} {tile.translation}
        </Nameplate>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-hidden bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] pt-4">
        <div
          className={`mx-auto flex h-full min-h-0 w-full max-w-xl flex-col px-5 transition-opacity ${
            acting ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {round ? (
            <>
              <p className="mb-2 flex shrink-0 items-baseline justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                <span className="min-w-0 truncate">
                  {MINIGAME_LABELS[round.type]} · {LORE.waystation.pell}
                  {round.chunk ? ` · Part ${round.chunk.index} of ${round.chunk.total}` : ""}
                </span>
                {accuracy !== null && (
                  <span className="shrink-0 whitespace-nowrap">
                    {LORE.waystation.accuracy} {accuracy}%
                  </span>
                )}
              </p>
              <div className="min-h-0 flex-1">
                <FreeDrillContext.Provider value={true}>
                  <MinigameRenderer
                    key={`${loop}:${roundIndex}`}
                    round={round}
                    translation={tile.translation}
                    onCheck={onCheck}
                  />
                </FreeDrillContext.Provider>
              </div>
            </>
          ) : (
            <p className="text-center text-[13px] text-ink-faint">{LORE.preMatch.loading}</p>
          )}
        </div>
      </div>
    </div>
  );
}
