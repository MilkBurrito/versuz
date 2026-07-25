// Casting — which enemy and which environment a match gets. All tunable.
//
// Rules (Alex, pass 5): THEMED verses get their theme's fixed enemy (per tier)
// and environment; untagged/default verses draw randomly from the tier / env
// pool, stable per match (hash of the match id). Campaign bosses are fixed.

import type { ThemeTag, VerseLevel } from "@/config/game";
import { enemiesOfTier, enemyById, type Enemy } from "@/config/enemies";
import { ENVIRONMENTS, type EnvMeta } from "@/config/environments.generated";

// --- theme → enemy per tier (small: L1-2, medium: L3-6) ---
const THEME_ENEMIES: Partial<Record<ThemeTag, { small: string; medium: string }>> = {
  anxiety: { small: "ghost", medium: "phantom" },
  temptation: { small: "snake", medium: "hell-hound" },
  doubt: { small: "reaper", medium: "werewolf" },
  identity: { small: "crow", medium: "nightmare" },
  wisdom: { small: "lizzard", medium: "mutant-toad" },
  strength: { small: "fire-skull", medium: "hell-beast" },
  // default: random from tier
};

// --- campaign boss castings (§8 named bosses → L7 roster) ---
const CAMPAIGN_BOSSES: Record<string, string> = {
  "campaign-foundation": "arch-demon", // The Accuser
  "campaign-anxiety": "wizard", // The Whisper
  "campaign-identity": "vampire", // The Mirror
  "campaign-wisdom": "centaur", // The Fool
  "campaign-temptation": "ogre", // The Tempter
  "campaign-strength": "treant", // The Weight
  "campaign-doubt": "dragon", // The Skeptic
};

// --- theme → match environment; untagged draws from the pool ---
const THEME_ENVIRONMENTS: Partial<Record<ThemeTag, string>> = {
  anxiety: "mist-forest",
  identity: "underwater",
  temptation: "lava",
  wisdom: "forest-road",
  strength: "rocky-pass",
  doubt: "forest-deep",
};

/** The hub's scene. */
export const HOME_ENVIRONMENT_ID = "forest-glow";

const ENV_POOL = ENVIRONMENTS.filter((e) => e.id !== HOME_ENVIRONMENT_ID);

/** Deterministic pick — same match id always resolves the same way. */
export function hashPick<T>(seed: string, pool: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length]!;
}

export function tierForLevel(level: VerseLevel): 1 | 2 | 3 {
  if (level <= 2) return 1;
  if (level <= 6) return 2;
  return 3;
}

/** Enemy for a regular (non-boss) match. */
export function castEnemy(matchId: string, tag: ThemeTag, level: VerseLevel): Enemy {
  const tier = tierForLevel(level);
  if (tier < 3) {
    const themed = THEME_ENEMIES[tag];
    if (themed) return enemyById(tier === 1 ? themed.small : themed.medium);
  }
  return hashPick(matchId, enemiesOfTier(tier));
}

/** Boss for a campaign fight (fixed casting; unknown campaigns draw randomly). */
export function castBoss(matchId: string, campaignId: string | null): Enemy {
  const fixed = campaignId ? CAMPAIGN_BOSSES[campaignId] : undefined;
  return fixed ? enemyById(fixed) : hashPick(matchId, enemiesOfTier(3));
}

export function envById(id: string): EnvMeta {
  const env = ENVIRONMENTS.find((e) => e.id === id);
  if (!env) throw new Error(`Unknown environment: ${id}`);
  return env;
}

/** Environment for a match: themed verses fixed, others rotate per match. */
export function castEnvironment(matchId: string, tag: ThemeTag): EnvMeta {
  const themed = THEME_ENVIRONMENTS[tag];
  if (themed) return envById(themed);
  return hashPick(matchId, ENV_POOL);
}
