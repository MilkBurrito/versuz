"use client";

// App store: snapshot of the authority's state + the client-side match session.
// The client runs the match presentation (rounds, HP, feedback) and reports the
// outcome; XP/level/energy/streak numbers shown afterwards come from the settle
// result (server-canonical), not client math.

import { create } from "zustand";
import { GAME, type TranslationCode, type VerseLevel } from "@/config/game";
import type { GameApi, GameSnapshot } from "@/data/api";
import { LocalGameApi } from "@/data/localApi";
import { CloudSaveStore } from "@/data/cloudSaveStore";
import type { MatchReport, SettleResult, Tile } from "@/data/types";
import { getVerseText } from "@/lib/bible/client";
import { isCloudMode, supabase } from "@/lib/supabase";
import { buildBossPlan, buildMatchPlan, plannedRoundCount, type MatchPlan } from "@/lib/engine/match";
import { levelFromXp } from "@/lib/engine/mastery";
import { matchXp, isRested } from "@/lib/engine/xp";

// The engine is the same either way; init() binds it to localStorage (demo)
// or the signed-in user's cloud save (Supabase player_saves).
let apiInstance: GameApi | null = null;

function api(): GameApi {
  if (!apiInstance) throw new Error("Game not initialized");
  return apiInstance;
}

export type PostMatchStep = "victory" | "xp" | "streak" | "chest" | "loss";

export interface MatchSession {
  matchId: string;
  /** Tile the match practices; null for boss fights. */
  tileId: string | null;
  /** Campaign for boss fights; null otherwise. */
  bossCampaignId: string | null;
  bossName: string | null;
  translation: TranslationCode;
  verseLevel: VerseLevel;
  plan: MatchPlan;
  roundIndex: number;
  playerHp: number;
  mistakes: number;
  /** Timed rounds finished before the clock lapsed (bonus XP at settle). */
  clocksBeaten: number;
  phase: "playing" | "finisher" | "post";
  postSteps: PostMatchStep[];
  postIndex: number;
  settle: SettleResult | null;
  result: "win" | "loss" | null;
}

interface AppState {
  ready: boolean;
  /** Cloud mode with no session — the auth screen gates the app. */
  authRequired: boolean;
  /** Signed-in email (cloud mode), for Settings display. */
  accountEmail: string | null;
  snapshot: GameSnapshot | null;
  overlayTileId: string | null;
  match: MatchSession | null;

  init(force?: boolean): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
  openOverlay(tileId: string): void;
  closeOverlay(): void;
  startPractice(tileId: string): Promise<void>;
  startBoss(campaignId: string): Promise<void>;
  /** `beatClock` is true when this round had a timer and it hadn't lapsed. */
  reportRound(correct: boolean, beatClock?: boolean): void;
  reportFinisher(correct: boolean): Promise<void>;
  /** Spend energy for a hint; true when it was affordable (UI then reveals). */
  spendHint(): Promise<boolean>;
  abandonMatch(): Promise<void>;
  advancePost(): void;
  exitPostMatch(): void;
  addTile(verseId: string, translation: TranslationCode, tag: Tile["tag"]): Promise<void>;
  addCampaign(campaignId: string): Promise<void>;
  deleteTile(tileId: string): Promise<void>;
  changeTranslation(tileId: string, translation: TranslationCode): Promise<void>;
  setTileRange(tileId: string, verseStart: number, verseEnd: number): Promise<void>;
  equip(slot: keyof GameSnapshot["user"]["equipped"], itemId: string | null): Promise<void>;
  saveCharacter(displayName: string, characterSprite: string): Promise<void>;
  completeOnboarding(): Promise<void>;
  saveSettings(settings: {
    defaultTranslation: GameSnapshot["user"]["defaultTranslation"];
    streakVisuals: boolean;
    dailyGoal: GameSnapshot["user"]["dailyGoal"];
    musicEnabled: boolean;
    sfxEnabled: boolean;
  }): Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  authRequired: false,
  accountEmail: null,
  snapshot: null,
  overlayTileId: null,
  match: null,

  async init(force = false) {
    if (get().ready && !force) return;
    if (isCloudMode()) {
      const { data } = await supabase().auth.getSession();
      const session = data.session;
      if (!session) {
        apiInstance = null;
        set({ ready: true, authRequired: true, accountEmail: null, snapshot: null });
        return;
      }
      apiInstance = new LocalGameApi(new CloudSaveStore(session.user.id), {
        seedDemo: false,
        displayName: session.user.email?.split("@")[0],
      });
      set({ accountEmail: session.user.email ?? null });
    } else {
      apiInstance ??= new LocalGameApi();
    }
    const snapshot = await api().load();
    set({ snapshot, ready: true, authRequired: false });
  },

  async signOut() {
    if (isCloudMode()) await supabase().auth.signOut();
    apiInstance = null;
    set({
      ready: true,
      authRequired: isCloudMode(),
      accountEmail: null,
      snapshot: null,
      match: null,
      overlayTileId: null,
    });
  },

  async refresh() {
    const snapshot = await api().load();
    set({ snapshot });
  },

  openOverlay(tileId) {
    set({ overlayTileId: tileId });
  },
  closeOverlay() {
    set({ overlayTileId: null });
  },

  async startPractice(tileId) {
    const snap = get().snapshot;
    const tile = snap?.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    const verseText = await getVerseText(tile.verseId, tile.translation);
    const level = levelFromXp(tile.verseXp, tile.masteryGoal);
    const start = await api().startMatch(tileId); // throws Error("no_energy") at 0
    const plan = buildMatchPlan(tile.verseId, verseText, level);
    set({
      overlayTileId: null,
      match: {
        matchId: start.matchId,
        tileId,
        bossCampaignId: null,
        bossName: null,
        translation: tile.translation,
        verseLevel: level,
        plan,
        roundIndex: 0,
        playerHp: plan.playerHp,
        mistakes: 0,
        clocksBeaten: 0,
        phase: "playing",
        postSteps: [],
        postIndex: 0,
        settle: null,
        result: null,
      },
    });
    void get().refresh();
  },

  async startBoss(campaignId) {
    const snap = get().snapshot;
    const campaign = snap?.campaigns.find((c) => c.id === campaignId);
    if (!snap || !campaign) return;
    const tiles = snap.tiles.filter((t) => t.addedFromCampaignId === campaignId);
    const verses = await Promise.all(
      tiles.map(async (t) => ({
        verseId: t.verseId,
        verseText: await getVerseText(t.verseId, t.translation),
      })),
    );
    const start = await api().startBossMatch(campaignId); // validates gate + energy
    const plan = buildBossPlan(verses);
    set({
      match: {
        matchId: start.matchId,
        tileId: null,
        bossCampaignId: campaignId,
        bossName: campaign.bossName,
        translation: tiles[0]?.translation ?? snap.user.defaultTranslation,
        verseLevel: 7,
        plan,
        roundIndex: 0,
        playerHp: plan.playerHp,
        mistakes: 0,
        clocksBeaten: 0,
        phase: "playing",
        postSteps: [],
        postIndex: 0,
        settle: null,
        result: null,
      },
    });
    void get().refresh();
  },

  reportRound(correct, beatClock = false) {
    const m = get().match;
    if (!m || m.phase !== "playing") return;
    if (correct) {
      const nextRound = m.roundIndex + 1;
      const clocksBeaten = m.clocksBeaten + (beatClock ? 1 : 0);
      if (nextRound >= m.plan.rounds.length) {
        set({ match: { ...m, roundIndex: nextRound, clocksBeaten, phase: "finisher" } });
      } else {
        set({ match: { ...m, roundIndex: nextRound, clocksBeaten } });
      }
    } else {
      const hp = m.playerHp - 1;
      const mistakes = m.mistakes + 1;
      if (hp <= 0) {
        set({ match: { ...m, playerHp: 0, mistakes, phase: "post", result: "loss", postSteps: ["loss"], postIndex: 0 } });
        void settle(get, set, {
          matchId: m.matchId,
          result: "loss",
          minigamesCompleted: m.roundIndex,
          mistakes,
          finisherCorrect: null,
          clocksBeaten: m.clocksBeaten,
        });
      } else {
        set({ match: { ...m, playerHp: hp, mistakes } });
      }
    }
  },

  async spendHint() {
    try {
      const remaining = await api().spendHintEnergy();
      if (remaining === null) return false;
      await get().refresh();
      return true;
    } catch (err) {
      console.error("hint spend failed", err);
      return false;
    }
  },

  async reportFinisher(correct) {
    const m = get().match;
    if (!m || m.phase !== "finisher") return;
    // Non-punishing: the win already happened; a miss only forfeits flawless (§5).
    await settle(get, set, {
      matchId: m.matchId,
      result: "win",
      minigamesCompleted: m.plan.rounds.length,
      mistakes: m.mistakes,
      finisherCorrect: correct,
      clocksBeaten: m.clocksBeaten,
    });
  },

  async abandonMatch() {
    const m = get().match;
    if (!m) return;
    // Confirmed exit: energy already spent, no XP, no streak credit, straight Home.
    await api().settleMatch({
      matchId: m.matchId,
      result: "abandon",
      minigamesCompleted: 0,
      mistakes: m.mistakes,
      finisherCorrect: null,
    });
    set({ match: null });
    await get().refresh();
  },

  advancePost() {
    const m = get().match;
    if (!m || m.phase !== "post") return;
    if (m.postIndex + 1 >= m.postSteps.length) {
      get().exitPostMatch();
    } else {
      set({ match: { ...m, postIndex: m.postIndex + 1 } });
    }
  },

  exitPostMatch() {
    set({ match: null });
    void get().refresh();
  },

  async addTile(verseId, translation, tag) {
    await api().addTile(verseId, translation, tag);
    await get().refresh();
  },

  async addCampaign(campaignId) {
    await api().addCampaign(campaignId);
    await get().refresh();
  },

  async deleteTile(tileId) {
    await api().deleteTile(tileId);
    set({ overlayTileId: null });
    await get().refresh();
  },

  async changeTranslation(tileId, translation) {
    await api().changeTranslation(tileId, translation);
    await get().refresh();
  },

  async setTileRange(tileId, verseStart, verseEnd) {
    await api().setTileRange(tileId, verseStart, verseEnd);
    await get().refresh();
  },

  async equip(slot, itemId) {
    const snap = get().snapshot;
    if (!snap) return;
    // Presentational-only write (client-updatable columns per the schema).
    snap.user.equipped = { ...snap.user.equipped, [slot]: itemId };
    await (api() as LocalGameApi).saveEquipped?.(snap.user.equipped);
    await get().refresh();
  },

  async completeOnboarding() {
    await (api() as LocalGameApi).completeOnboarding?.();
    await get().refresh();
  },

  async saveCharacter(displayName, characterSprite) {
    await (api() as LocalGameApi).saveProfile?.({ displayName, characterSprite });
    await get().refresh();
  },

  async saveSettings(settings) {
    await (api() as LocalGameApi).saveSettings?.(settings);
    await get().refresh();
  },
}));

// Dev handle for driving flows from the console / preview tooling.
declare global {
  interface Window {
    __vz?: typeof useApp;
  }
}
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__vz = useApp;
}

async function settle(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  report: MatchReport,
): Promise<void> {
  let result: SettleResult;
  try {
    result = await api().settleMatch(report);
  } catch (err) {
    // Never strand the player on a dead match screen: bail to Home. (Progress
    // for this match is lost, but the alternative is a frozen finisher.)
    console.error("settle failed", err);
    set({ match: null });
    void get().refresh();
    return;
  }
  const m = get().match;
  if (!m) return;
  if (report.result === "win") {
    // v1.2: conditional sequence — Victory → XP → [Streak 1st today] → [Chest] → Home.
    const steps: PostMatchStep[] = ["victory", "xp"];
    if (result.streak.firstMatchToday) steps.push("streak");
    if (result.tile?.mastered || result.player.leveledUp || result.campaign?.cleared)
      steps.push("chest");
    set({ match: { ...m, phase: "post", result: "win", settle: result, postSteps: steps, postIndex: 0 } });
  } else {
    set({ match: { ...m, settle: result } });
  }
}

/**
 * Honest "Practice · +XP" preview (§13-C): what the next match awards right now
 * for a clean win — rested + diminishing applied, flawless bonus not assumed.
 * Round count mirrors buildMatchPlan (word count recovered from the mastery goal).
 */
export function previewPracticeXp(tile: Tile): number {
  const level = levelFromXp(tile.verseXp, tile.masteryGoal);
  const words = Math.round((tile.masteryGoal - GAME.mastery.FLOOR) / GAME.mastery.PER_WORD);
  const minigames = plannedRoundCount(level, words);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const practiceToday = tile.lastPracticedDate === todayStr ? tile.practiceTodayCount : 0;
  return matchXp({
    minigamesCompleted: minigames,
    finisherReached: true,
    perfect: false,
    rested: isRested(tile.lastPracticedDate, todayStr),
    practiceCountToday: practiceToday,
    clocksBeaten: 0, // never promise a speed bonus up front
  }).awarded;
}
