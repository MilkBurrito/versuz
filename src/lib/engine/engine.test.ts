import { describe, expect, it } from "vitest";
import { GAME } from "@/config/game";
import { masteryGoal, levelFromXp, xpThresholdForLevel, extendReset } from "@/lib/engine/mastery";
import { matchXp, isRested, diminishingModifier } from "@/lib/engine/xp";
import { energyAt, secondsToNextEnergy, spendEnergy } from "@/lib/engine/energy";
import { chunkCount, splitVerseText, splitWords } from "@/lib/engine/split";
import { tokenize, normalizeText } from "@/lib/engine/text";
import { buildBossPlan, buildMatchPlan, plannedRoundCount, playerHpForLevel, sequenceForLevel, SPLITTABLE, buildTrainingPlan, type MinigameType } from "@/lib/engine/match";
import {
  buildFadingWords,
  buildMysteryWord,
  buildSnowballSegments,
  buildSpotTheLie,
  buildWordBank,
  buildWordOrder,
  rapidRecallMatches,
} from "@/lib/engine/minigames";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import {
  parseRef,
  displayRef,
  memberVerseIds,
  adjacentVerseIds,
  extendedRefId,
  referenceAnswerMatches,
  buildRangeId,
  versesInChapter,
} from "@/lib/refs";

const JOHN_3_16_KJV =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";

describe("mastery (§9.2–9.3)", () => {
  it("computes the spec's worked goals", () => {
    expect(masteryGoal(25)).toBe(700);
    expect(masteryGoal(12)).toBe(440);
    expect(masteryGoal(33)).toBe(860);
  });

  it("derives levels from cumulative XP at the spec thresholds (goal 700)", () => {
    expect(xpThresholdForLevel(2, 700)).toBe(56);
    expect(xpThresholdForLevel(3, 700)).toBe(126);
    expect(xpThresholdForLevel(4, 700)).toBe(224);
    expect(xpThresholdForLevel(5, 700)).toBe(350);
    expect(xpThresholdForLevel(6, 700)).toBe(504);
    expect(levelFromXp(0, 700)).toBe(1);
    expect(levelFromXp(55, 700)).toBe(1);
    expect(levelFromXp(56, 700)).toBe(2);
    expect(levelFromXp(699, 700)).toBe(6);
    expect(levelFromXp(700, 700)).toBe(7);
  });

  it("resets on extend per clamp(level−2, 1, 3) and re-bases XP to the new goal", () => {
    expect(extendReset(1, 1000).level).toBe(1);
    expect(extendReset(4, 1000).level).toBe(2);
    expect(extendReset(7, 1000).level).toBe(3);
    expect(extendReset(7, 1000).verseXp).toBe(Math.round(0.18 * 1000));
  });
});

describe("match XP (§9.4 worked example)", () => {
  it("fresh tile, first match of day, 5 minigames + finisher, perfect, rested → ~44", () => {
    const xp = matchXp({
      minigamesCompleted: 5,
      finisherReached: true,
      perfect: true,
      rested: true,
      practiceCountToday: 0,
    });
    expect(xp.base).toBe(25);
    expect(xp.awarded).toBe(44); // 25 × 1.75 = 43.75 → 44
  });

  it("second match same day, perfect, not rested → ~19", () => {
    const xp = matchXp({
      minigamesCompleted: 5,
      finisherReached: true,
      perfect: true,
      rested: false,
      practiceCountToday: 1,
    });
    expect(xp.awarded).toBe(19); // 25 × 1.5 × 0.5 = 18.75 → 19
  });

  it("diminishing: 100/50/25 and floors at 25%", () => {
    expect(diminishingModifier(0)).toBe(1);
    expect(diminishingModifier(1)).toBe(0.5);
    expect(diminishingModifier(2)).toBe(0.25);
    expect(diminishingModifier(9)).toBe(0.25);
  });

  it("rested = untouched since before today", () => {
    expect(isRested(null, "2026-07-07")).toBe(true);
    expect(isRested("2026-07-06", "2026-07-07")).toBe(true);
    expect(isRested("2026-07-07", "2026-07-07")).toBe(false);
  });
});

describe("energy (§9.5)", () => {
  const H = 60 * 60 * 1000;
  it("regenerates +1 per REGEN_SECONDS up to the cap", () => {
    const t0 = 0;
    const spent = { current: 0, lastUpdated: t0 };
    expect(energyAt(spent, t0 + 5 * H).current).toBe(1);
    expect(energyAt(spent, t0 + 24 * H).current).toBe(4);
    expect(energyAt(spent, t0 + 25 * H).current).toBe(5);
    expect(energyAt(spent, t0 + 100 * H).current).toBe(5);
  });
  it("spend fails at 0 and starts the clock when leaving the cap", () => {
    expect(spendEnergy({ current: 0, lastUpdated: 0 }, 1000)).toBeNull();
    const s = spendEnergy({ current: 5, lastUpdated: 0 }, 1234)!;
    expect(s.current).toBe(4);
    expect(s.lastUpdated).toBe(1234);
    expect(secondsToNextEnergy(s, 1234)).toBe(GAME.energy.REGEN_SECONDS);
  });
});

describe("splitting (§6)", () => {
  it("chunk counts: 1–15→1, 16–30→2, 31–45→3, 46+→4", () => {
    expect(chunkCount(15)).toBe(1);
    expect(chunkCount(16)).toBe(2);
    expect(chunkCount(30)).toBe(2);
    expect(chunkCount(31)).toBe(3);
    expect(chunkCount(46)).toBe(4);
    expect(chunkCount(120)).toBe(4);
  });

  it("snaps to a clause boundary within the ±20% window", () => {
    // John 3:16 KJV = 25 words → 2 chunks, ideal cut at 12.5; the comma after
    // "Son," ends word 13 — inside the window → cut at 13.
    const chunks = splitVerseText(JOHN_3_16_KJV);
    expect(chunks.length).toBe(2);
    expect(chunks[0]!.at(-1)!.display).toBe("Son,");
    expect(chunks[0]!.length + chunks[1]!.length).toBe(25);
  });

  it("falls back to the exact word-count point with no boundary in window", () => {
    const words = tokenize("one two three four five six seven eight");
    const chunks = splitWords(words, 2);
    expect(chunks[0]!.length).toBe(4);
    expect(chunks[1]!.length).toBe(4);
  });
});

describe("match plan (§5)", () => {
  it("L1 on a 25-word verse expands splittable slots into chunk rounds", () => {
    // L1 sequence = 4 splittable games × 2 chunks = 8 rounds.
    const plan = buildMatchPlan("JHN.3.16", JOHN_3_16_KJV, 1, () => 0.42);
    expect(plan.rounds.length).toBe(8);
    expect(plan.enemyHp).toBe(8);
    expect(plan.playerHp).toBe(5);
    expect(plan.finisher.mode).toBe("choice");
    expect(plan.enemies.reduce((a, b) => a + b, 0)).toBe(8);
    expect(plannedRoundCount(1, 25)).toBe(8);
  });

  it("chunk rounds carry their prior parts as context; part 1 has none", () => {
    const plan = buildMatchPlan("JHN.3.16", JOHN_3_16_KJV, 1, () => 0.42);
    const part1 = plan.rounds[0]!;
    const part2 = plan.rounds[1]!;
    expect(part1.chunk).toEqual({ index: 1, total: 2 });
    expect(part1.contextWords.length).toBe(0);
    expect(part2.chunk).toEqual({ index: 2, total: 2 });
    expect(part2.contextWords.map((w) => w.display)).toEqual(
      part1.words.map((w) => w.display),
    );
  });

  it("follows the §5 sequence for the level; L7 is random with Rapid Recall last", () => {
    expect(sequenceForLevel(3, () => 0.1)).toEqual(GAME.sequencesByLevel[2]);
    const l7 = sequenceForLevel(7, () => 0.6);
    expect(l7.length).toBe(7);
    expect(l7.at(-1)).toBe("rapid_recall");
    expect(l7.slice(0, -1)).not.toContain("rapid_recall");
  });

  it("mixes minigame types within a match (not all word bank)", () => {
    const plan = buildMatchPlan("JHN.3.16", JOHN_3_16_KJV, 5, () => 0.3);
    const types = new Set(plan.rounds.map((r) => r.type));
    expect(types.size).toBeGreaterThan(2);
  });

  it("soft-caps total minigames at 10 and preview matches the plan", () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    for (const level of [1, 3, 5, 7] as const) {
      const plan = buildMatchPlan("PSA.119.1", long, level, () => 0.7);
      expect(plan.rounds.length).toBeLessThanOrEqual(GAME.split.SOFT_CAP_TOTAL_MINIGAMES);
    }
    expect(plannedRoundCount(1, 60)).toBe(GAME.split.SOFT_CAP_TOTAL_MINIGAMES);
  });

  it("typed finisher from L4; player HP shrinks 5→2", () => {
    expect(buildMatchPlan("JHN.3.16", JOHN_3_16_KJV, 4).finisher.mode).toBe("typed");
    expect(playerHpForLevel(1)).toBe(5);
    expect(playerHpForLevel(7)).toBe(2);
  });

  it("boss plan draws rounds across the campaign's verses", () => {
    let seed = 0.05;
    const rng = () => (seed = (seed * 9301 + 0.49297) % 1);
    const plan = buildBossPlan(
      [
        { verseId: "JHN.3.16", verseText: JOHN_3_16_KJV },
        { verseId: "PSA.34.4", verseText: "I sought the LORD, and he heard me, and delivered me from all my fears." },
      ],
      rng,
    );
    expect(plan.isBoss).toBe(true);
    expect(plan.rounds.length).toBe(GAME.boss.MINIGAMES);
    expect(plan.playerHp).toBe(GAME.boss.PLAYER_HP);
    expect(new Set(plan.rounds.map((r) => r.verseId)).size).toBeGreaterThan(1);
    expect(plan.rounds.map((r) => r.verseId)).toContain(plan.finisher.verseId);
  });
});

describe("minigame generators (§6)", () => {
  const plan = buildMatchPlan("JHN.3.16", JOHN_3_16_KJV, 1, () => 0.42);
  const round = plan.rounds[0]!; // chunk 1 of John 3:16
  const whole = { ...round, words: tokenize(JOHN_3_16_KJV), chunk: null, contextWords: [] };

  it("word bank: all answers + 2–3 decoys not in the chunk", () => {
    const wb = buildWordBank(round, () => 0.42);
    expect(wb.bank.filter((b) => !b.isDecoy).length).toBe(wb.answers.length);
    const decoys = wb.bank.filter((b) => b.isDecoy);
    expect(decoys.length).toBeGreaterThanOrEqual(2);
    expect(decoys.length).toBeLessThanOrEqual(3);
    const answerSet = new Set(wb.answers.map((w) => w.norm));
    for (const d of decoys) expect(answerSet.has(d.word)).toBe(false);
  });

  it("word order: same words scrambled, never pre-solved", () => {
    const wo = buildWordOrder(round, () => 0.99);
    expect([...wo.bank].sort()).toEqual(round.words.map((w) => w.norm).sort());
    expect(wo.bank.join(" ")).not.toBe(round.words.map((w) => w.norm).join(" "));
  });

  it("mystery word: hides a content word and includes it among 4 options", () => {
    const mw = buildMysteryWord(whole, () => 0.3);
    expect(mw.options.length).toBe(4);
    expect(mw.options).toContain(whole.words[mw.hiddenIndex]!.norm);
    expect(new Set(mw.options).size).toBe(4);
  });

  it("fading words: fades ~35% (min 2) and banks exactly the faded words", () => {
    const fw = buildFadingWords(whole, () => 0.5);
    expect(fw.fadedIndexes.length).toBe(Math.round(25 * GAME.fadingWords.FADE_FRACTION));
    expect([...fw.bank].sort()).toEqual(
      fw.fadedIndexes.map((i) => whole.words[i]!.norm).sort(),
    );
  });

  it("spot the lie: swaps two content words with different norms", () => {
    const stl = buildSpotTheLie(whole, () => 0.2)!;
    const [i, j] = stl.swapped;
    expect(stl.displayed[i]!.norm).toBe(whole.words[j]!.norm);
    expect(stl.displayed[j]!.norm).toBe(whole.words[i]!.norm);
    expect(whole.words[i]!.norm).not.toBe(whole.words[j]!.norm);
  });

  it("snowball: clause segments rebuild the verse, capped", () => {
    const segments = buildSnowballSegments(tokenize(JOHN_3_16_KJV));
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.length).toBeLessThanOrEqual(GAME.snowball.MAX_SEGMENTS);
    expect(segments.flat().map((w) => w.display).join(" ")).toBe(JOHN_3_16_KJV);
  });

  it("rapid recall: normalized match with 1-typo tolerance on longer words", () => {
    const words = tokenize("For God so loved the world");
    expect(rapidRecallMatches(words, "for god so loved the world")).toBe(true);
    expect(rapidRecallMatches(words, "for god so lovedd the world")).toBe(true); // typo ok (5+ chars)
    expect(rapidRecallMatches(words, "for gid so loved the world")).toBe(false); // short word strict
    expect(rapidRecallMatches(words, "for god so loved the")).toBe(false); // missing word
  });

  it("splittable set matches the spec (§6)", () => {
    expect([...SPLITTABLE].sort()).toEqual(
      ["fading_words", "first_letter", "word_bank", "word_order"].sort(),
    );
  });
});

describe("refs (USFM)", () => {
  it("parses singles and ranges", () => {
    expect(parseRef("JHN.3.16")).toEqual({ book: "JHN", chapter: 3, verseStart: 16, verseEnd: null });
    expect(parseRef("ISA.43.18-19").verseEnd).toBe(19);
    expect(() => parseRef("ISA.43.19-18")).toThrow();
  });
  it("displays human references (incl. the Psalm citation convention)", () => {
    expect(displayRef("JHN.3.16")).toBe("John 3:16");
    expect(displayRef("ISA.43.18-19")).toBe("Isaiah 43:18-19");
    expect(displayRef("1JN.5.13")).toBe("1 John 5:13");
    expect(displayRef("PSA.23.1")).toBe("Psalm 23:1");
  });

  it("builds range ids from picker selections, bounded by the chapter", () => {
    expect(buildRangeId("ISA", 43, 18, 20)).toBe("ISA.43.18-20");
    expect(buildRangeId("ISA", 43, 19, 19)).toBe("ISA.43.19");
    expect(buildRangeId("ISA", 43, 20, 18)).toBe("ISA.43.18-20"); // order-agnostic
    expect(versesInChapter("JHN", 3)).toBe(36);
    expect(() => buildRangeId("JHN", 3, 30, 40)).toThrow();
  });
  it("expands range members and finds contiguous neighbors", () => {
    expect(memberVerseIds("ISA.43.18-19")).toEqual(["ISA.43.18", "ISA.43.19"]);
    expect(adjacentVerseIds("JHN.3.16")).toEqual({ before: "JHN.3.15", after: "JHN.3.17" });
    expect(adjacentVerseIds("GEN.1.1").before).toBeNull();
    expect(extendedRefId("ISA.43.19", "ISA.43.18")).toBe("ISA.43.18-19");
    expect(extendedRefId("ISA.43.18-19", "ISA.43.20")).toBe("ISA.43.18-20");
    expect(() => extendedRefId("ISA.43.18", "ISA.43.20")).toThrow();
  });
  it("matches typed finisher answers leniently, incl. ranges", () => {
    expect(referenceAnswerMatches("JHN.3.16", "John 3:16")).toBe(true);
    expect(referenceAnswerMatches("JHN.3.16", "john 3.16")).toBe(true);
    expect(referenceAnswerMatches("ISA.43.18-19", "Isaiah 43:18-19")).toBe(true);
    expect(referenceAnswerMatches("JHN.3.16", "John 3:17")).toBe(false);
  });
});

describe("player level (§9.8)", () => {
  it("derives level from lifetime XP, capped at 30", () => {
    expect(playerLevelFromXp(0)).toBe(1);
    expect(playerLevelFromXp(GAME.player.xpForLevel(2))).toBe(2);
    expect(playerLevelFromXp(10_000_000)).toBe(30);
  });
});

describe("text normalization", () => {
  it("auto-handles capitalization/punctuation", () => {
    expect(normalizeText("For God so loved the world,")).toBe("for god so loved the world");
  });
});

describe("training ground plans", () => {
  const verse = "For God so loved the world that he gave his only begotten Son";

  it("runs the same number of rounds as a real match at that level", () => {
    const real = buildMatchPlan("JHN.3.16", verse, 3);
    const training = buildTrainingPlan("JHN.3.16", verse, 3, ["word_bank"]);
    expect(training.rounds.length).toBe(real.rounds.length);
  });

  it("only uses the games the player picked", () => {
    const chosen: MinigameType[] = ["word_bank", "mystery_word"];
    const plan = buildTrainingPlan("JHN.3.16", verse, 5, chosen);
    expect(plan.rounds.length).toBeGreaterThan(0);
    for (const r of plan.rounds) expect(chosen).toContain(r.type);
  });

  it("cycles through every chosen game", () => {
    const chosen: MinigameType[] = ["word_bank", "mystery_word", "rapid_recall"];
    const plan = buildTrainingPlan("JHN.3.16", verse, 7, chosen);
    const used = new Set(plan.rounds.map((r) => r.type));
    for (const g of chosen) expect(used.has(g)).toBe(true);
  });
});
