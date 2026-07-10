// Edge Function: settle-match — canonical XP award + level recalc + boss gate (§9, §15).
// The client reports WHAT happened (rounds completed, mistakes, finisher result);
// the server decides what it is WORTH: recomputes base/perfect/rested/diminishing
// from its own stored state, never trusting client XP numbers, then recalculates
// verse level from cumulative XP, player level, mastery, streak, and the
// all-verses-at-L3 boss gate for any campaign the tile belongs to.
//
// Deploy: supabase functions deploy settle-match
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GAME, levelFromXp, playerLevelFromXp, diminishingModifier } from "../_shared/config.ts";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: userData, error: authError } = await createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  ).auth.getUser();
  if (authError || !userData.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json() as {
    matchId: string;
    result: "win" | "loss" | "abandon";
    minigamesCompleted: number;
    mistakes: number;
    finisherCorrect: boolean | null;
  };

  const { data: match } = await supabase
    .from("matches").select("*").eq("id", body.matchId).eq("user_id", userId).single();
  if (!match || match.ended_at) return Response.json({ error: "invalid match" }, { status: 409 });
  const { data: tile } = await supabase
    .from("user_verses").select("*").eq("id", match.user_verse_id).single();
  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single();
  if (!tile || !user) return Response.json({ error: "not found" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const practiceToday = tile.last_practiced_date === today ? tile.practice_today_count : 0;
  const rested = tile.last_practiced_date === null || tile.last_practiced_date < today;

  // Sanity-bound the reported round count against the plan-size cap.
  const minigames = Math.max(0, Math.min(body.minigamesCompleted, GAME.split.SOFT_CAP_TOTAL_MINIGAMES));

  let xpAwarded = 0, base = 0, perfectBonus = 0, restedBonus = 0;
  const mod = diminishingModifier(practiceToday);
  let playerXpDelta = 0;

  if (body.result === "win") {
    base = GAME.xp.PER_MINIGAME * minigames + GAME.xp.FINISHER_BONUS;
    const perfect = body.mistakes === 0 && body.finisherCorrect === true;
    perfectBonus = perfect ? base * GAME.xp.PERFECT_BONUS : 0;
    restedBonus = rested ? base * GAME.xp.RESTED_BONUS : 0;
    xpAwarded = Math.round((base + perfectBonus + restedBonus) * mod);
    playerXpDelta = xpAwarded;
  } else if (body.result === "loss") {
    playerXpDelta = GAME.xp.LOSS_CONSOLATION_PLAYER_XP; // player XP only, no mastery XP
  } // abandon: nothing

  // --- Tile update (mastery XP never decreases) ---
  const newVerseXp = tile.verse_xp + (body.result === "win" ? xpAwarded : 0);
  const newLevel = levelFromXp(newVerseXp, tile.mastery_goal);
  const nowMastered = newLevel >= 7 && tile.status !== "mastered";
  if (nowMastered) playerXpDelta += GAME.player.VERSE_MASTERED_XP;

  if (body.result !== "abandon") {
    await supabase.from("user_verses").update({
      verse_xp: newVerseXp,
      level: newLevel,
      status: nowMastered ? "mastered" : tile.status,
      mastery_date: nowMastered ? new Date().toISOString() : tile.mastery_date,
      last_practiced_date: today,
      practice_today_count: practiceToday + 1,
      practice_count: tile.practice_count + 1,
    }).eq("id", tile.id);
  }

  // --- Streak: completed matches (win or loss) count; abandon does not (§5) ---
  let streak = user.current_streak;
  let firstMatchToday = false;
  if (body.result !== "abandon" && user.last_streak_date !== today) {
    firstMatchToday = true;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = user.last_streak_date === yesterday ? streak + 1 : 1;
  }

  const newPlayerXp = user.player_xp + playerXpDelta;
  const newPlayerLevel = playerLevelFromXp(newPlayerXp);
  const playerLeveledUp = newPlayerLevel > user.player_level;
  const coins = body.result === "win" ? GAME.coins.PER_WIN : body.result === "loss" ? GAME.coins.PER_LOSS : 0;

  await supabase.from("users").update({
    player_xp: newPlayerXp,
    player_level: newPlayerLevel,
    banked_currency: user.banked_currency + coins,
    current_streak: streak,
    longest_streak: Math.max(user.longest_streak, streak),
    last_streak_date: body.result !== "abandon" ? today : user.last_streak_date,
    last_active: new Date().toISOString(),
  }).eq("id", userId);

  await supabase.from("matches").update({
    result: body.result,
    minigames_attempted: minigames + body.mistakes,
    minigames_correct: minigames,
    finisher_correct: body.finisherCorrect,
    verse_level_at_end: newLevel,
    xp_base: Math.round(base),
    xp_perfect_bonus: Math.round(perfectBonus),
    xp_rested_bonus: Math.round(restedBonus),
    xp_diminishing_modifier: mod,
    xp_awarded: xpAwarded,
    ended_at: new Date().toISOString(),
  }).eq("id", match.id);

  // --- Boss gate (§8): recompute all_verses_at_l3 for the tile's campaign ---
  if (tile.added_from_campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns").select("verse_ids").eq("id", tile.added_from_campaign_id).single();
    if (campaign) {
      const { data: tiles } = await supabase
        .from("user_verses")
        .select("verse_id, level")
        .eq("user_id", userId)
        .eq("added_from_campaign_id", tile.added_from_campaign_id);
      const levels = new Map((tiles ?? []).map((t) => [t.verse_id, t.level]));
      const allAtL3 = campaign.verse_ids.every(
        (vid: string) => (levels.get(vid) ?? 0) >= GAME.boss.UNLOCK_MIN_LEVEL,
      );
      await supabase.from("user_campaigns").upsert({
        user_id: userId,
        campaign_id: tile.added_from_campaign_id,
        all_verses_at_l3: allAtL3,
        status: "in_progress",
      }, { onConflict: "user_id,campaign_id", ignoreDuplicates: false });
    }
  }

  return Response.json({
    xp: { base: Math.round(base), perfectBonus: Math.round(perfectBonus), restedBonus: Math.round(restedBonus), diminishingModifier: mod, awarded: xpAwarded },
    playerXpDelta,
    tile: { verseXp: newVerseXp, level: newLevel, mastered: nowMastered },
    player: { xp: newPlayerXp, level: newPlayerLevel, leveledUp: playerLeveledUp },
    streak: { count: streak, firstMatchToday },
    coins,
  });
});
