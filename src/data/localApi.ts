// LocalGameApi — the game's authority. Runs the canonical engine math against
// a state document whose persistence lives behind the SaveStore seam:
// localStorage (demo mode, seeded) or Supabase cloud saves (signed-in play,
// fresh start). The UI treats this as a server: it reports what happened and
// receives what it was worth. NOTE (v0 launch): in cloud mode the scoring math
// runs client-side and the doc syncs last-write-wins; moving scoring into
// Edge Functions (supabase/functions) is the queued hardening pass.

import { GAME, type ThemeTag, type TranslationCode } from "@/config/game";
import { getVerseText } from "@/lib/bible/client";
import { energyAt, spendEnergy } from "@/lib/engine/energy";
import { extendReset, isMastered, levelFromXp, masteryGoal } from "@/lib/engine/mastery";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import { wordCount } from "@/lib/engine/text";
import { diminishingModifier, isRested, matchXp } from "@/lib/engine/xp";
import { buildRangeId, parseRef } from "@/lib/refs";
import type { GameApi, GameSnapshot } from "@/data/api";
import { LocalSaveStore, type SaveStore } from "@/data/saveStore";
import { SEED_CAMPAIGNS, SEED_TILES, SEED_USER } from "@/data/seed";
import type {
  MatchReport,
  SettleResult,
  StartMatchResult,
  Tile,
  UserCampaign,
  UserState,
} from "@/data/types";

export interface GameApiOptions {
  /** Demo mode seeds a mid-journey user; cloud users start fresh. */
  seedDemo: boolean;
  /** Display name for fresh (non-demo) users, e.g. from their email. */
  displayName?: string;
}

interface OpenMatch {
  id: string;
  tileId: string | null; // null for boss matches
  campaignId: string | null; // set for boss matches
  levelAtStart: number;
  practiceCountToday: number;
  rested: boolean;
}

interface Doc {
  user: UserState;
  tiles: Tile[];
  userCampaigns: UserCampaign[];
  openMatches: OpenMatch[];
}

function todayStr(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoStr(days: number): string {
  return todayStr(Date.now() - days * 86400000);
}

function uid(): string {
  return crypto.randomUUID();
}

export class LocalGameApi implements GameApi {
  private doc: Doc | null = null;
  private readonly store: SaveStore;
  private readonly opts: GameApiOptions;

  constructor(store: SaveStore = new LocalSaveStore(), opts: GameApiOptions = { seedDemo: true }) {
    this.store = store;
    this.opts = opts;
  }

  private save(): void {
    if (this.doc) this.store.save(JSON.stringify(this.doc));
  }

  private get(): Doc {
    if (!this.doc) throw new Error("LocalGameApi not loaded");
    return this.doc;
  }

  async load(): Promise<GameSnapshot> {
    // The in-memory doc is the authority once loaded; the store is
    // write-behind persistence. Re-reading it here would race in-flight
    // cloud saves (a stale SELECT can replace the doc mid-match, then get
    // queued and clobber the newer save — losing energy spends and the open
    // match, which strands the finisher on "invalid match").
    if (!this.doc) {
      const raw = await this.store.load();
      if (raw) {
        this.doc = JSON.parse(raw) as Doc;
        // Migrate docs saved before the field existed / with retired sprite ids
        // (soldier/knight/thief/anomaly → the Elementals era).
        const VALID_HEROES = ["fire-knight", "water-priestess", "crystal-mauler", "leaf-ranger", "metal-bladekeeper"];
        if (!VALID_HEROES.includes(this.doc.user.characterSprite)) {
          this.doc.user.characterSprite = "fire-knight";
        }
      } else {
        this.doc = this.opts.seedDemo ? await this.createSeedDoc() : this.createFreshDoc();
      }
    }
    // Lazy energy regen on load (what the server does on every read).
    const user = this.get().user;
    user.energy = energyAt(user.energy, Date.now());
    this.save();
    return this.snapshot();
  }

  /** A brand-new cloud player: empty library, full energy, day one. */
  private createFreshDoc(): Doc {
    return {
      user: {
        id: uid(),
        displayName: this.opts.displayName?.trim() || "Hero",
        characterSprite: "fire-knight",
        characterGender: "man",
        characterSkinTone: "tone3",
        characterHair: "style1",
        equipped: { weapon: "starter-sword", body: null, necklace: null, feet: null },
        defaultTranslation: "KJV",
        dailyGoal: 1,
        streakVisuals: true,
        playerXp: 0,
        coins: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStreakDate: null,
        streakFreezeAvailable: true,
        energy: { current: GAME.energy.MAX, lastUpdated: Date.now() },
        onboardingCompleted: false,
      },
      tiles: [],
      userCampaigns: [],
      openMatches: [],
    };
  }

  private snapshot(): GameSnapshot {
    const d = this.get();
    return {
      user: { ...d.user },
      tiles: d.tiles.map((t) => ({ ...t })),
      campaigns: SEED_CAMPAIGNS,
      userCampaigns: d.userCampaigns.map((c) => ({ ...c })),
    };
  }

  private async createSeedDoc(): Promise<Doc> {
    const tiles: Tile[] = [];
    for (const s of SEED_TILES) {
      const text = await getVerseText(s.verseId, s.translation);
      const goal = masteryGoal(wordCount(text));
      const mastered = s.verseXpFraction >= 1;
      tiles.push({
        id: uid(),
        verseId: s.verseId,
        translation: s.translation,
        verseXp: Math.round(goal * s.verseXpFraction),
        masteryGoal: goal,
        status: mastered ? "mastered" : "active",
        tag: s.tag,
        addedFromCampaignId: s.campaignId,
        masteryDate: mastered ? new Date(Date.now() - 5 * 86400000).toISOString() : null,
        lastPracticedDate:
          s.lastPracticedDaysAgo === null ? null : daysAgoStr(s.lastPracticedDaysAgo),
        practiceTodayCount: s.lastPracticedDaysAgo === 0 ? 1 : 0,
        practiceCount: s.lastPracticedDaysAgo === null ? 0 : mastered ? 18 : 3,
      });
    }
    return {
      user: {
        id: uid(),
        displayName: SEED_USER.displayName,
        characterSprite: "fire-knight",
        characterGender: "man",
        characterSkinTone: "tone3",
        characterHair: "style1",
        equipped: { weapon: "starter-sword", body: null, necklace: null, feet: null },
        defaultTranslation: "KJV",
        dailyGoal: 1,
        streakVisuals: true,
        playerXp: SEED_USER.playerXp,
        coins: SEED_USER.coins,
        currentStreak: SEED_USER.currentStreak,
        longestStreak: SEED_USER.longestStreak,
        lastStreakDate: daysAgoStr(1), // streak alive, today not yet secured
        streakFreezeAvailable: true,
        energy: { current: GAME.energy.MAX, lastUpdated: Date.now() },
        onboardingCompleted: true,
      },
      tiles,
      userCampaigns: [
        { campaignId: "campaign-anxiety", status: "in_progress", allVersesAtL3: false, bossDefeated: false },
      ],
      openMatches: [],
    };
  }

  // --- start-match (mirrors supabase/functions/start-match) ---
  async startMatch(tileId: string): Promise<StartMatchResult> {
    const d = this.get();
    const tile = d.tiles.find((t) => t.id === tileId);
    if (!tile) throw new Error("tile not found");

    const now = Date.now();
    const spent = spendEnergy(d.user.energy, now);
    if (!spent) throw new Error("no_energy");
    d.user.energy = spent;

    const today = todayStr(now);
    const practiceCountToday = tile.lastPracticedDate === today ? tile.practiceTodayCount : 0;
    const match: OpenMatch = {
      id: uid(),
      tileId,
      campaignId: null,
      levelAtStart: levelFromXp(tile.verseXp, tile.masteryGoal),
      practiceCountToday,
      rested: isRested(tile.lastPracticedDate, today),
    };
    d.openMatches.push(match);
    this.save();
    return {
      matchId: match.id,
      energy: spent.current,
      practiceCountToday,
      rested: match.rested,
    };
  }

  // --- boss fight (§8): gate re-validated server-side, energy spent like any match ---
  async startBossMatch(campaignId: string): Promise<StartMatchResult> {
    const d = this.get();
    const campaign = SEED_CAMPAIGNS.find((c) => c.id === campaignId);
    if (!campaign) throw new Error("campaign not found");
    const levels = new Map(
      d.tiles
        .filter((t) => t.addedFromCampaignId === campaignId)
        .map((t) => [t.verseId, levelFromXp(t.verseXp, t.masteryGoal)]),
    );
    const gateOpen = campaign.verseIds.every(
      (vid) => (levels.get(vid) ?? 0) >= GAME.boss.UNLOCK_MIN_LEVEL,
    );
    if (!gateOpen) throw new Error("boss_locked");

    const spent = spendEnergy(d.user.energy, Date.now());
    if (!spent) throw new Error("no_energy");
    d.user.energy = spent;

    const match: OpenMatch = {
      id: uid(),
      tileId: null,
      campaignId,
      levelAtStart: 7,
      practiceCountToday: 0,
      rested: false,
    };
    d.openMatches.push(match);
    this.save();
    return { matchId: match.id, energy: spent.current, practiceCountToday: 0, rested: false };
  }

  // --- settle-match (mirrors supabase/functions/settle-match) ---
  async settleMatch(report: MatchReport): Promise<SettleResult> {
    const d = this.get();
    const idx = d.openMatches.findIndex((m) => m.id === report.matchId);
    const open = d.openMatches[idx];
    if (!open) throw new Error("invalid match");
    d.openMatches.splice(idx, 1);
    if (open.campaignId !== null && open.tileId === null) {
      return this.settleBoss(open, report);
    }
    const tile = d.tiles.find((t) => t.id === open.tileId);
    if (!tile) throw new Error("tile not found");

    const today = todayStr();
    const minigames = Math.max(
      0,
      Math.min(report.minigamesCompleted, GAME.split.SOFT_CAP_TOTAL_MINIGAMES),
    );

    let xp = { base: 0, perfectBonus: 0, restedBonus: 0, diminishingModifier: diminishingModifier(open.practiceCountToday), awarded: 0 };
    let playerXpDelta = 0;

    if (report.result === "win") {
      xp = matchXp({
        minigamesCompleted: minigames,
        finisherReached: true,
        perfect: report.mistakes === 0 && report.finisherCorrect === true,
        rested: open.rested,
        practiceCountToday: open.practiceCountToday,
      });
      playerXpDelta = xp.awarded;
    } else if (report.result === "loss") {
      playerXpDelta = GAME.xp.LOSS_CONSOLATION_PLAYER_XP;
    }

    // Tile: mastery XP never decreases; level derived from cumulative XP.
    const newVerseXp = tile.verseXp + (report.result === "win" ? xp.awarded : 0);
    const newLevel = levelFromXp(newVerseXp, tile.masteryGoal);
    const nowMastered = isMastered(newVerseXp, tile.masteryGoal) && tile.status !== "mastered";
    if (nowMastered) playerXpDelta += GAME.player.VERSE_MASTERED_XP;

    if (report.result !== "abandon") {
      tile.verseXp = newVerseXp;
      if (nowMastered) {
        tile.status = "mastered";
        tile.masteryDate = new Date().toISOString();
      }
      tile.practiceTodayCount = open.practiceCountToday + 1;
      tile.practiceCount += 1;
      tile.lastPracticedDate = today;
    }

    // Streak: completed matches count (win or loss); abandon does not.
    let firstMatchToday = false;
    if (report.result !== "abandon" && d.user.lastStreakDate !== today) {
      firstMatchToday = true;
      d.user.currentStreak =
        d.user.lastStreakDate === daysAgoStr(1) ? d.user.currentStreak + 1 : 1;
      d.user.longestStreak = Math.max(d.user.longestStreak, d.user.currentStreak);
      d.user.lastStreakDate = today;
    }

    const prevPlayerLevel = playerLevelFromXp(d.user.playerXp);

    // Boss gate + campaign mastery: recompute for the tile's campaign.
    if (tile.addedFromCampaignId) {
      const campaign = SEED_CAMPAIGNS.find((c) => c.id === tile.addedFromCampaignId);
      if (campaign) {
        const campaignTiles = d.tiles.filter((t) => t.addedFromCampaignId === campaign.id);
        const levels = new Map(
          campaignTiles.map((t) => [t.verseId, levelFromXp(t.verseXp, t.masteryGoal)]),
        );
        const allAtL3 = campaign.verseIds.every(
          (vid) => (levels.get(vid) ?? 0) >= GAME.boss.UNLOCK_MIN_LEVEL,
        );
        let uc = d.userCampaigns.find((c) => c.campaignId === campaign.id);
        if (!uc) {
          uc = { campaignId: campaign.id, status: "in_progress", allVersesAtL3: false, bossDefeated: false };
          d.userCampaigns.push(uc);
        }
        uc.allVersesAtL3 = allAtL3;
        // §8 Campaign Mastered: every campaign verse at L7 → one-time bonus,
        // and the card graduates off Home (it lives on in Profile badges).
        const allMastered = campaign.verseIds.every((vid) => (levels.get(vid) ?? 0) >= 7);
        if (allMastered && uc.status !== "mastered") {
          uc.status = "mastered";
          playerXpDelta += GAME.player.CAMPAIGN_MASTERED_XP;
        }
      }
    }

    d.user.playerXp += playerXpDelta;
    const newPlayerLevel = playerLevelFromXp(d.user.playerXp);
    const coins =
      report.result === "win"
        ? GAME.coins.PER_WIN
        : report.result === "loss"
          ? GAME.coins.PER_LOSS
          : 0;
    d.user.coins += coins;

    this.save();
    return {
      xp,
      playerXpDelta,
      tile: {
        id: tile.id,
        verseXp: newVerseXp,
        masteryGoal: tile.masteryGoal,
        level: newLevel,
        mastered: nowMastered,
      },
      player: {
        xp: d.user.playerXp,
        level: newPlayerLevel,
        leveledUp: newPlayerLevel > prevPlayerLevel,
      },
      streak: { count: d.user.currentStreak, firstMatchToday },
      coins,
      campaign: null,
    };
  }

  // Boss settlement: 250 player XP on defeat; Campaign Cleared (+1000, permanent)
  // when the gate held and the boss fell. No mastery XP (§9.9).
  private settleBoss(open: OpenMatch, report: MatchReport): SettleResult {
    const d = this.get();
    const today = todayStr();
    const won = report.result === "win";
    let playerXpDelta = 0;
    if (won) playerXpDelta += GAME.player.BOSS_DEFEAT_XP;
    else if (report.result === "loss") playerXpDelta += GAME.xp.LOSS_CONSOLATION_PLAYER_XP;

    let uc = d.userCampaigns.find((c) => c.campaignId === open.campaignId);
    if (!uc) {
      uc = { campaignId: open.campaignId!, status: "in_progress", allVersesAtL3: true, bossDefeated: false };
      d.userCampaigns.push(uc);
    }
    let cleared = false;
    if (won && !uc.bossDefeated) {
      uc.bossDefeated = true;
      if (uc.status !== "cleared" && uc.status !== "mastered") {
        uc.status = "cleared"; // permanent (§8)
        cleared = true;
        playerXpDelta += GAME.player.CAMPAIGN_CLEARED_XP;
      }
    }

    let firstMatchToday = false;
    if (report.result !== "abandon" && d.user.lastStreakDate !== today) {
      firstMatchToday = true;
      d.user.currentStreak =
        d.user.lastStreakDate === daysAgoStr(1) ? d.user.currentStreak + 1 : 1;
      d.user.longestStreak = Math.max(d.user.longestStreak, d.user.currentStreak);
      d.user.lastStreakDate = today;
    }

    const prevPlayerLevel = playerLevelFromXp(d.user.playerXp);
    d.user.playerXp += playerXpDelta;
    const newPlayerLevel = playerLevelFromXp(d.user.playerXp);
    const coins = won ? GAME.coins.PER_WIN : report.result === "loss" ? GAME.coins.PER_LOSS : 0;
    d.user.coins += coins;
    this.save();

    return {
      xp: { base: won ? GAME.player.BOSS_DEFEAT_XP : 0, perfectBonus: 0, restedBonus: 0, diminishingModifier: 1, awarded: won ? GAME.player.BOSS_DEFEAT_XP : 0 },
      playerXpDelta,
      tile: null,
      player: {
        xp: d.user.playerXp,
        level: newPlayerLevel,
        leveledUp: newPlayerLevel > prevPlayerLevel,
      },
      streak: { count: d.user.currentStreak, firstMatchToday },
      coins,
      campaign: { campaignId: open.campaignId!, bossDefeated: uc.bossDefeated, cleared },
    };
  }

  /** Hints cost energy like matches do (GAME.hints.ENERGY_COST, spent 1 at a time). */
  async spendHintEnergy(): Promise<number | null> {
    const d = this.get();
    let energy = d.user.energy;
    for (let i = 0; i < GAME.hints.ENERGY_COST; i++) {
      const spent = spendEnergy(energy, Date.now());
      if (!spent) return null;
      energy = spent;
    }
    d.user.energy = energy;
    this.save();
    return energy.current;
  }

  async addTile(verseId: string, translation: TranslationCode, tag: ThemeTag): Promise<Tile> {
    const d = this.get();
    const existing = d.tiles.find((t) => t.verseId === verseId && t.translation === translation);
    if (existing) return existing; // re-adding opens the existing tile (§7)
    const text = await getVerseText(verseId, translation);
    const tile: Tile = {
      id: uid(),
      verseId,
      translation,
      verseXp: 0,
      masteryGoal: masteryGoal(wordCount(text)),
      status: "active",
      tag,
      addedFromCampaignId: null, // individual adds are always standalone
      masteryDate: null,
      lastPracticedDate: null,
      practiceTodayCount: 0,
      practiceCount: 0,
    };
    d.tiles.push(tile);
    this.save();
    return tile;
  }

  // Add the whole campaign: adopt existing tiles for its verses (any
  // translation — progress kept), create the rest in the default translation.
  async addCampaign(campaignId: string): Promise<void> {
    const d = this.get();
    const campaign = SEED_CAMPAIGNS.find((c) => c.id === campaignId);
    if (!campaign) throw new Error("campaign not found");
    for (const verseId of campaign.verseIds) {
      const existing = d.tiles.find((t) => t.verseId === verseId);
      if (existing) {
        existing.addedFromCampaignId = campaignId;
        if (existing.tag === "default") existing.tag = campaign.theme;
      } else {
        const translation = d.user.defaultTranslation;
        const text = await getVerseText(verseId, translation);
        d.tiles.push({
          id: uid(),
          verseId,
          translation,
          verseXp: 0,
          masteryGoal: masteryGoal(wordCount(text)),
          status: "active",
          tag: campaign.theme,
          addedFromCampaignId: campaignId,
          masteryDate: null,
          lastPracticedDate: null,
          practiceTodayCount: 0,
          practiceCount: 0,
        });
      }
    }
    let uc = d.userCampaigns.find((c) => c.campaignId === campaignId);
    if (!uc) {
      uc = { campaignId, status: "in_progress", allVersesAtL3: false, bossDefeated: false };
      d.userCampaigns.push(uc);
    }
    this.save();
  }

  /** Presentational write: persist the four equip slots (client-updatable). */
  async saveEquipped(equipped: UserState["equipped"]): Promise<void> {
    const d = this.get();
    d.user.equipped = { ...equipped };
    this.save();
  }

  /** Presentational write: first-run induction into the Guard is complete. */
  async completeOnboarding(): Promise<void> {
    const d = this.get();
    d.user.onboardingCompleted = true;
    this.save();
  }

  /** Presentational write: character identity (name + sprite). */
  async saveProfile(profile: { displayName: string; characterSprite: string }): Promise<void> {
    const d = this.get();
    d.user.displayName = profile.displayName.trim() || d.user.displayName;
    d.user.characterSprite = profile.characterSprite;
    this.save();
  }

  /** Presentational write: preferences (client-updatable columns). */
  async saveSettings(settings: {
    defaultTranslation: UserState["defaultTranslation"];
    streakVisuals: boolean;
    dailyGoal: UserState["dailyGoal"];
  }): Promise<void> {
    const d = this.get();
    d.user.defaultTranslation = settings.defaultTranslation;
    d.user.streakVisuals = settings.streakVisuals;
    d.user.dailyGoal = settings.dailyGoal;
    this.save();
  }

  async deleteTile(tileId: string): Promise<void> {
    const d = this.get();
    d.tiles = d.tiles.filter((t) => t.id !== tileId);
    this.save();
  }

  async changeTranslation(tileId: string, translation: TranslationCode): Promise<Tile> {
    const d = this.get();
    const tile = d.tiles.find((t) => t.id === tileId);
    if (!tile) throw new Error("tile not found");
    if (d.tiles.some((t) => t.verseId === tile.verseId && t.translation === translation))
      throw new Error("translation already held for this verse");
    const text = await getVerseText(tile.verseId, translation);
    tile.translation = translation;
    tile.masteryGoal = masteryGoal(wordCount(text));
    tile.verseXp = 0; // the memorized words change → progress resets (§7)
    tile.status = "active";
    tile.masteryDate = null;
    this.save();
    return tile;
  }

  async setTileRange(tileId: string, verseStart: number, verseEnd: number): Promise<Tile> {
    const d = this.get();
    const tile = d.tiles.find((t) => t.id === tileId);
    if (!tile) throw new Error("tile not found");
    const ref = parseRef(tile.verseId);
    const newId = buildRangeId(ref.book, ref.chapter, verseStart, verseEnd);
    if (newId === tile.verseId) return tile; // no change, no reset
    if (
      d.tiles.some(
        (t) => t.id !== tileId && t.verseId === newId && t.translation === tile.translation,
      )
    )
      throw new Error("duplicate_tile");
    const text = await getVerseText(newId, tile.translation);
    const newGoal = masteryGoal(wordCount(text));
    // Any range change (grow or shrink) changes the memorization target →
    // the §7 reset applies both ways: clamp(level−2, 1, 3), XP re-based.
    const currentLevel = levelFromXp(tile.verseXp, tile.masteryGoal);
    const reset = extendReset(currentLevel, newGoal);
    tile.verseId = newId;
    tile.masteryGoal = newGoal;
    tile.verseXp = reset.verseXp;
    tile.status = "active";
    tile.masteryDate = null;
    this.save();
    return tile;
  }
}

export function resetLocalData(): void {
  void new LocalSaveStore().clear();
}
