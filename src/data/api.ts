// GameApi — the seam between the UI and the authority that scores the game.
//
// LocalGameApi (default) runs the canonical engine in-browser with localStorage
// persistence, playing the role the Supabase Edge Functions play in production
// (same inputs, same math, same outputs — see supabase/functions/*).
// SupabaseGameApi implements this interface against start-match/settle-match
// when a project is provisioned (supabase/README.md).

import type { TranslationCode, ThemeTag } from "@/config/game";
import type {
  CampaignDef,
  MatchReport,
  SettleResult,
  StartMatchResult,
  Tile,
  UserCampaign,
  UserState,
} from "@/data/types";

export interface GameSnapshot {
  user: UserState;
  tiles: Tile[];
  campaigns: CampaignDef[];
  userCampaigns: UserCampaign[];
}

export interface GameApi {
  /** Load (creating the dev user + seed on first run in local mode). */
  load(): Promise<GameSnapshot>;
  /** Spend 1 energy and open a match. Throws Error("no_energy") at 0. */
  startMatch(tileId: string): Promise<StartMatchResult>;
  /** Report what happened; the authority decides what it's worth. */
  settleMatch(report: MatchReport): Promise<SettleResult>;
  /** Spend 1 energy and open the campaign boss fight (gate: all verses L3+). */
  startBossMatch(campaignId: string): Promise<StartMatchResult>;
  /**
   * Adds a verse as a STANDALONE tile (campaign membership only ever comes from
   * addCampaign — individual adds from a campaign keep just the theme tag).
   */
  addTile(verseId: string, translation: TranslationCode, tag: ThemeTag): Promise<Tile>;
  /**
   * Add the ENTIRE campaign: adopts any existing tiles for its verses into the
   * campaign (progress kept) and creates the missing ones in the user's default
   * translation. Only then does the campaign card appear on Home.
   */
  addCampaign(campaignId: string): Promise<void>;
  deleteTile(tileId: string): Promise<void>;
  /** §7: swap translation in place — resets progress. */
  changeTranslation(tileId: string, translation: TranslationCode): Promise<Tile>;
  /**
   * Re-target the tile to a contiguous in-chapter range (grow or shrink). Any
   * change applies the §7 reset: clamp(level−2, 1, 3), XP re-based on the new goal.
   */
  setTileRange(tileId: string, verseStart: number, verseEnd: number): Promise<Tile>;
}
