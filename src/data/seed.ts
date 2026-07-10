// Demo seed for the walking skeleton — a signed-in user mid-journey so Home,
// the overlay states (rested / fresh / passage), and the campaign card are all
// reviewable. Onboarding (which replaces this) is a follow-up pass.

import type { CampaignDef } from "@/data/types";

// Full v1 roster per Appendix D. Note: Temptation's "Matthew 4:1–11 (key
// verses)" is represented as MAT.4.4 — flagged for content review.
export const SEED_CAMPAIGNS: CampaignDef[] = [
  {
    id: "campaign-foundation",
    name: "Foundation Track",
    theme: "default",
    description: "Where every sword is forged. The essentials.",
    verseIds: ["JHN.3.16", "ROM.3.23", "ROM.5.8", "ROM.10.9", "EPH.2.8-9", "JHN.5.24", "1JN.5.13", "ROM.8.1"],
    bossName: "The Accuser",
    requiredPlayerLevel: 1,
    displayOrder: 0,
  },
  {
    id: "campaign-anxiety",
    name: "Anxiety",
    theme: "anxiety",
    description: "Verses for fear, worry, peace.",
    verseIds: ["PHP.4.6-7", "MAT.6.34", "PSA.34.4", "JHN.14.27", "ISA.41.10", "1PE.5.7"],
    bossName: "The Whisper",
    requiredPlayerLevel: 1,
    displayOrder: 1,
  },
  {
    id: "campaign-identity",
    name: "Identity",
    theme: "identity",
    description: "Who you are when the mirror lies.",
    verseIds: ["EPH.2.10", "2CO.5.17", "GAL.2.20", "1PE.2.9", "ROM.8.14-16", "JHN.1.12"],
    bossName: "The Mirror",
    requiredPlayerLevel: 3,
    displayOrder: 2,
  },
  {
    id: "campaign-wisdom",
    name: "Wisdom",
    theme: "wisdom",
    description: "Trust, direction, and the fear of the LORD.",
    verseIds: ["PRO.3.5-6", "JAS.1.5", "PRO.1.7", "PSA.119.105", "ECC.7.12", "PRO.16.9"],
    bossName: "The Fool",
    requiredPlayerLevel: 3,
    displayOrder: 3,
  },
  {
    id: "campaign-temptation",
    name: "Temptation",
    theme: "temptation",
    description: "The way of escape, verse by verse.",
    verseIds: ["1CO.10.13", "JAS.1.12-15", "MAT.4.4", "HEB.4.15-16", "ROM.6.11-14", "GAL.5.16"],
    bossName: "The Tempter",
    requiredPlayerLevel: 5,
    displayOrder: 4,
  },
  {
    id: "campaign-strength",
    name: "Strength",
    theme: "strength",
    description: "For when the weight is heavy.",
    verseIds: ["PHP.4.13", "ISA.40.31", "JOS.1.9", "2TI.1.7", "PSA.46.1", "EPH.6.10"],
    bossName: "The Weight",
    requiredPlayerLevel: 5,
    displayOrder: 5,
  },
  {
    id: "campaign-doubt",
    name: "Doubt",
    theme: "doubt",
    description: "Help thou mine unbelief.",
    verseIds: ["MRK.9.24", "HEB.11.1", "JHN.20.27-29", "JAS.1.6", "ROM.4.20-21", "PSA.42.5"],
    bossName: "The Skeptic",
    requiredPlayerLevel: 7,
    displayOrder: 6,
  },
];

/**
 * Tiles the demo user has already added. A campaign only appears on Home when
 * ALL its verses were added to it — the Anxiety campaign here is complete:
 * four verses mastered (still visible in the dropdown) and two at L3, so the
 * boss gate is open.
 */
export const SEED_TILES: {
  verseId: string;
  translation: "KJV" | "ASV";
  tag: "anxiety" | "default";
  campaignId: string | null;
  verseXpFraction: number; // of mastery goal (>= 1 seeds as mastered)
  lastPracticedDaysAgo: number | null;
}[] = [
  // Anxiety campaign — fully added: 4 mastered + 2 at L3 → boss gate open
  { verseId: "PHP.4.6-7", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 0.2, lastPracticedDaysAgo: 0 },
  { verseId: "MAT.6.34", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 0.19, lastPracticedDaysAgo: 2 },
  { verseId: "PSA.34.4", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 1, lastPracticedDaysAgo: 9 },
  { verseId: "JHN.14.27", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 1, lastPracticedDaysAgo: 12 },
  // 35 days idle → demos the mastered-but-Needs-Refresh state on Profile (§9.7)
  { verseId: "ISA.41.10", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 1, lastPracticedDaysAgo: 35 },
  { verseId: "1PE.5.7", translation: "KJV", tag: "anxiety", campaignId: "campaign-anxiety", verseXpFraction: 1, lastPracticedDaysAgo: 6 },
  // Standalones: same verse in two translations, plus a passage tile
  { verseId: "JHN.3.16", translation: "KJV", tag: "default", campaignId: null, verseXpFraction: 0.55, lastPracticedDaysAgo: 1 },
  { verseId: "JHN.3.16", translation: "ASV", tag: "default", campaignId: null, verseXpFraction: 0, lastPracticedDaysAgo: null },
  { verseId: "ISA.43.18-19", translation: "KJV", tag: "default", campaignId: null, verseXpFraction: 0.22, lastPracticedDaysAgo: 3 },
];

export const SEED_USER = {
  displayName: "Alex",
  playerXp: 950,
  coins: 192,
  currentStreak: 12,
  longestStreak: 23,
} as const;
