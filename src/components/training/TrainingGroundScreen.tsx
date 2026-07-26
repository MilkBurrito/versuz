"use client";

// THE TRAINING GROUND — free practice that cannot touch the review schedule
// or the economy, by construction:
//
//   · Only verses you've already battled at least once are offered (new
//     material must enter through a real match so the scheduler owns its
//     intervals from day one).
//   · Nothing here calls startMatch / settleMatch / reportRound — the
//     authority never hears about a session. No energy, no XP, no embers, no
//     streak, no mastery. Session accuracy is cosmetic and not persisted.
//   · The opponent is the training dummy, not an enemy — no stakes to read.
//     Hints are free here (FreeDrillContext).
//
// Setup → session → summary. The player picks the verse AND which games to
// play; the session runs the same length as a real match at that verse's
// level (buildTrainingPlan cycles the chosen games).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/state/store";
import type { Tile } from "@/data/types";
import type { EnvMeta } from "@/config/environments.generated";
import { getVerseText } from "@/lib/bible/client";
import { buildTrainingPlan, type MatchPlan, type MinigameType } from "@/lib/engine/match";
import type { VerseLevel } from "@/config/game";
import { levelFromXp } from "@/lib/engine/mastery";
import { displayRef } from "@/lib/refs";
import { TEXT } from "@/copy/strings";
import { DUMMY_DISPLAY_H, DUMMY_SPRITE, TRAINABLE_GAMES, TRAINING_ENVS } from "@/config/training";
import { BattleClickContext, Button } from "@/components/ui/Button";
import { EnemyHpBar } from "@/components/ui/Bars";
import { Nameplate } from "@/components/ui/Nameplate";
import { CloseIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { playSfx } from "@/lib/audio/engine";
import { Parallax } from "@/components/match/Parallax";
import { RoundTimer } from "@/components/match/RoundTimer";
import { FreeDrillContext } from "@/components/match/minigames/shared";
import { MINIGAME_LABELS, MinigameRenderer } from "@/components/match/minigames/MinigameRenderer";

const ATTACK_CYCLE = ["atk1", "atk2", "atk3"] as const;

interface Setup {
  tile: Tile;
  games: MinigameType[];
  /** L1–L7 the player picked — sets how hard the games play (not the verse's
      own level), so any verse can be drilled at any point on the ladder. */
  level: VerseLevel;
}

export function TrainingGroundScreen({ onClose }: { onClose: () => void }) {
  const { snapshot } = useApp();
  // Drillable = verses the scheduler already owns (battled at least once).
  const drillable = useMemo(
    () => (snapshot?.tiles ?? []).filter((t) => t.practiceCount > 0),
    [snapshot],
  );
  const [setup, setSetup] = useState<Setup | null>(null);
  const [env] = useState(() => TRAINING_ENVS[Math.floor(Math.random() * TRAINING_ENVS.length)]!);

  if (setup) {
    return (
      <Session
        key={`${setup.tile.id}:${setup.level}:${setup.games.join(",")}`}
        setup={setup}
        env={env}
        onChangeSetup={() => setSetup(null)}
        onClose={onClose}
      />
    );
  }
  return <SetupScreen drillable={drillable} env={env} onStart={setSetup} onClose={onClose} />;
}

// ---------------------------------------------------------------------------

/**
 * The scene header mirrors a real fight exactly: an X, one health bar, one
 * name. No screen title, no round counter — the counter lives down beside the
 * minigame label, same as a match.
 *
 * `hp` is omitted on the setup screen (nothing is being fought yet), where the
 * title is shown instead so the place still identifies itself.
 */
function Scene({
  env,
  onClose,
  closeLabel,
  hp,
  name,
  title,
  children,
}: {
  env: EnvMeta;
  onClose: () => void;
  closeLabel: string;
  /** The dummy's life bar — cosmetic; it tracks session progress. */
  hp?: { total: number; remaining: number };
  name?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full shrink-0 pb-9 pt-[calc(env(safe-area-inset-top)+8px)]">
      <Parallax env={env} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="relative flex items-start gap-3 px-4">
          <button
            aria-label={closeLabel}
            onClick={onClose}
            className="mt-0.5 rounded-full p-1.5 text-white/90 active:bg-white/10"
          >
            <CloseIcon size={18} />
          </button>
          <div className="flex-1 pr-2">
            {hp && <EnemyHpBar total={hp.total} remaining={hp.remaining} />}
            {(name ?? title) && (
              <p
                className={`text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                  hp ? "mt-1" : "pt-1"
                }`}
              >
                {name ?? title}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SetupScreen({
  drillable,
  env,
  onStart,
  onClose,
}: {
  drillable: Tile[];
  env: EnvMeta;
  onStart: (s: Setup) => void;
  onClose: () => void;
}) {
  const [tileId, setTileId] = useState<string | null>(drillable[0]?.id ?? null);
  const [games, setGames] = useState<MinigameType[]>(() => [...TRAINABLE_GAMES]);
  const tile = drillable.find((t) => t.id === tileId) ?? null;
  // Default to where the verse actually sits, then let them move it anywhere.
  const [level, setLevel] = useState<VerseLevel>(
    () => (tile ? levelFromXp(tile.verseXp, tile.masteryGoal) : 3) as VerseLevel,
  );

  function toggle(g: MinigameType) {
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-x-clip bg-white">
      <Scene env={env} onClose={onClose} closeLabel={TEXT.training.leave} title={TEXT.training.title}>
        <div style={{ minHeight: 130 }} className="mt-3 flex items-end justify-center px-6">
          <div className="flex justify-center overflow-visible" style={{ width: 120 }}>
            <SpriteAnimator sprite={DUMMY_SPRITE} anim="idle" size={DUMMY_DISPLAY_H} />
          </div>
        </div>
      </Scene>
      <div className="relative z-10 -mt-5 flex w-full shrink-0 justify-center">
        <Nameplate>{TEXT.training.dummy}</Nameplate>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5">
        <div className="mx-auto w-full max-w-xl px-5">
          <p className="text-center text-[12px] leading-relaxed text-ink-soft">
            {TEXT.training.intro}
          </p>

          {drillable.length === 0 ? (
            <>
              <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-faint">
                {TEXT.training.noVerses}
              </p>
              <Button variant="outline" className="mx-auto mt-6 block" onClick={onClose}>
                {TEXT.training.leave}
              </Button>
            </>
          ) : (
            <>
              {/* --- verse --- */}
              <SectionHeading>{TEXT.training.chooseVerse}</SectionHeading>
              <div className="flex flex-col gap-2">
                {drillable.map((t) => {
                  const on = t.id === tileId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTileId(t.id)}
                      className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                        on ? "border-gold bg-gold-wash" : "border-shell-deep/40 bg-white active:bg-shell"
                      }`}
                    >
                      <span className={`text-[15px] font-bold ${on ? "text-gold-deep" : "text-ink"}`}>
                        {displayRef(t.verseId)}{" "}
                        <span className="text-[11px] font-bold text-ink-faint">{t.translation}</span>
                      </span>
                      <span className="text-[11px] font-extrabold text-ink-faint">
                        L{levelFromXp(t.verseXp, t.masteryGoal)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* --- games --- */}
              <div className="mt-6 flex items-baseline justify-between">
                <SectionHeading className="mb-0">{TEXT.training.chooseGames}</SectionHeading>
                <div className="flex gap-2 text-[11px] font-extrabold uppercase tracking-wide">
                  <button
                    className="text-gold-deep active:underline"
                    onClick={() => setGames([...TRAINABLE_GAMES])}
                  >
                    {TEXT.training.all}
                  </button>
                  <span className="text-ink-faint">·</span>
                  <button className="text-ink-faint active:underline" onClick={() => setGames([])}>
                    {TEXT.training.none}
                  </button>
                </div>
              </div>
              <p className="mb-2 mt-1 text-[11px] font-bold text-ink-faint">
                {TEXT.training.gamesHint}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TRAINABLE_GAMES.map((g) => {
                  const on = games.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggle(g)}
                      aria-pressed={on}
                      className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-[13px] font-bold transition-colors ${
                        on
                          ? "border-gold bg-gold-wash text-gold-deep"
                          : "border-shell-deep/40 bg-white text-ink-faint active:bg-shell"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] leading-none ${
                          on ? "border-gold-deep bg-gold-deep text-white" : "border-shell-deep/50"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      {MINIGAME_LABELS[g]}
                    </button>
                  );
                })}
              </div>

              {/* --- difficulty --- */}
              <SectionHeading>{TEXT.training.chooseLevel}</SectionHeading>
              <p className="mb-2 -mt-1 text-[11px] font-bold text-ink-faint">
                {TEXT.training.levelHint}
              </p>
              <div className="flex gap-1 rounded-xl bg-shell p-1">
                {([1, 2, 3, 4, 5, 6, 7] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    aria-pressed={l === level}
                    className={`flex-1 rounded-lg py-2 text-[12px] font-extrabold transition-colors ${
                      l === level ? "bg-gold text-gold-dark shadow-sm" : "text-ink-soft"
                    }`}
                  >
                    L{l}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-ink-faint">
                {TEXT.training.levelBlurb(level)}
              </p>

              <div className="mt-6">
                <Button
                  className="w-full"
                  disabled={games.length === 0 || tile === null}
                  onClick={() => tile && onStart({ tile, games, level })}
                >
                  {games.length === 0
                    ? TEXT.training.startDisabled
                    : TEXT.training.startCount(games.length)}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  children,
  className = "mb-2",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint ${className}`}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------

interface AnimState {
  anim: string;
  key: number;
}

function Session({
  setup,
  env,
  onChangeSetup,
  onClose,
}: {
  setup: Setup;
  env: EnvMeta;
  onChangeSetup: () => void;
  onClose: () => void;
}) {
  const { tile, games, level } = setup;
  const { snapshot } = useApp();
  const hero = characterById(snapshot?.user.characterSprite);
  const [plan, setPlan] = useState<MatchPlan | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [session, setSession] = useState(0); // bump to re-roll a fresh session
  const [done, setDone] = useState(false);
  const [heroAnim, setHeroAnim] = useState<AnimState>({ anim: "idle", key: 0 });
  const [dummyAnim, setDummyAnim] = useState<AnimState>({ anim: "idle", key: 0 });
  const [acting, setActing] = useState(false);
  const [atkCount, setAtkCount] = useState(0);
  const [strikes, setStrikes] = useState({ hit: 0, total: 0 });
  const heroDoneRef = useRef<(() => void) | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The plan is built locally — the drill never talks to the authority.
  useEffect(() => {
    let alive = true;
    getVerseText(tile.verseId, tile.translation).then((text) => {
      if (!alive) return;
      setPlan(buildTrainingPlan(tile.verseId, text, level, games));
      setRoundIndex(0);
      setDone(false);
      setStrikes({ hit: 0, total: 0 });
    });
    return () => {
      alive = false;
    };
  }, [tile, games, level, session]);

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
      playSfx("attack-swing");
      playSfx(hero.id === "leaf-ranger" ? "hit-ranged" : "hit-melee");
      setActing(true);
      setHeroAnim((s) => ({ anim, key: s.key + 1 }));
      setDummyAnim((s) => ({ anim: "hit", key: s.key + 1 }));
      heroDoneRef.current = () => {
        heroDoneRef.current = null;
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setActing(false);
        setHeroAnim((s) => ({ anim: "idle", key: s.key + 1 }));
        setDummyAnim((s) => ({ anim: "idle", key: s.key + 1 }));
        if (roundIndex + 1 >= plan.rounds.length) setDone(true);
        else setRoundIndex((i) => i + 1);
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
    // A session is a fight: its buttons click like one.
    <BattleClickContext.Provider value={true}>
    <div className="fixed inset-0 z-[60] flex flex-col overflow-x-clip bg-white">
      <Scene
        env={env}
        onClose={onClose}
        closeLabel={TEXT.training.quit}
        name={TEXT.training.dummy}
        hp={
          plan
            ? {
                total: plan.rounds.length,
                // `done` means the last blow landed — the bar must read empty,
                // not one segment short (roundIndex stops at the final round).
                remaining: done ? 0 : Math.max(0, plan.rounds.length - roundIndex),
              }
            : undefined
        }
      >
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
              sprite={DUMMY_SPRITE}
              anim={dummyAnim.anim}
              size={DUMMY_DISPLAY_H}
              playKey={dummyAnim.key}
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
          {done ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-[22px] font-extrabold text-ink">{TEXT.training.doneTitle}</h2>
              {accuracy !== null && (
                <p className="mt-1.5 text-[14px] font-bold text-gold-deep">
                  {TEXT.training.doneAccuracy(accuracy)}
                </p>
              )}
              <p className="mt-1 text-[12px] text-ink-faint">{TEXT.training.doneSub}</p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={onChangeSetup}>
                  {TEXT.training.change}
                </Button>
                <Button onClick={() => setSession((n) => n + 1)}>{TEXT.training.again}</Button>
              </div>
            </div>
          ) : round ? (
            <>
              {round.timerSeconds !== null && (
                <div className="mb-2 shrink-0">
                  <RoundTimer
                    key={`clock-${roundIndex}`}
                    seconds={round.timerSeconds}
                    paused={acting}
                    onExpire={() => {}}
                  />
                </div>
              )}
              <p className="mb-2 flex shrink-0 items-baseline justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                <span className="min-w-0 truncate">
                  {MINIGAME_LABELS[round.type]} · {roundIndex + 1}/{plan?.rounds.length ?? 0}
                  {round.chunk ? ` · Part ${round.chunk.index} of ${round.chunk.total}` : ""}
                </span>
                {accuracy !== null && (
                  <span className="shrink-0 whitespace-nowrap">
                    {TEXT.training.accuracy} {accuracy}%
                  </span>
                )}
              </p>
              <div className="min-h-0 flex-1">
                <FreeDrillContext.Provider value={true}>
                  <MinigameRenderer
                    key={`${session}:${roundIndex}`}
                    round={round}
                    translation={tile.translation}
                    onCheck={onCheck}
                  />
                </FreeDrillContext.Provider>
              </div>
            </>
          ) : (
            <p className="text-center text-[13px] text-ink-faint">{TEXT.preMatch.loading}</p>
          )}
        </div>
      </div>
    </div>
    </BattleClickContext.Provider>
  );
}
