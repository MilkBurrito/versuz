// Edge Function: start-match — the ONLY way energy is spent (§9.5, §15).
// Recomputes energy from (current_energy, energy_last_updated), rejects at 0,
// decrements, resets practice_today_count on day change, and opens a match row.
//
// Deploy: supabase functions deploy start-match
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GAME } from "../_shared/config.ts";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } },
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
  const { tileId } = await req.json();

  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single();
  const { data: tile } = await supabase
    .from("user_verses").select("*").eq("id", tileId).eq("user_id", userId).single();
  if (!user || !tile) return Response.json({ error: "not found" }, { status: 404 });

  // Lazy energy regen
  const now = Date.now();
  const last = new Date(user.energy_last_updated).getTime();
  const gained = Math.floor((now - last) / (GAME.energy.REGEN_SECONDS * 1000));
  let energy = Math.min(GAME.energy.MAX, user.current_energy + Math.max(0, gained));
  let lastUpdated = energy >= GAME.energy.MAX ? now : last + gained * GAME.energy.REGEN_SECONDS * 1000;

  if (energy < GAME.energy.COST_PER_MATCH) {
    return Response.json({ error: "no_energy" }, { status: 409 });
  }
  if (energy >= GAME.energy.MAX) lastUpdated = now; // start the clock on leaving the cap
  energy -= GAME.energy.COST_PER_MATCH;

  // Day rollover: reset the diminishing counter
  const today = new Date().toISOString().slice(0, 10);
  const practiceToday = tile.last_practiced_date === today ? tile.practice_today_count : 0;

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      user_id: userId,
      user_verse_id: tile.id,
      verse_id: tile.verse_id,
      translation: tile.translation,
      verse_level_at_start: tile.level,
      result: "abandon", // pessimistic; settle-match overwrites
      energy_spent: GAME.energy.COST_PER_MATCH,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase
    .from("users")
    .update({
      current_energy: energy,
      energy_last_updated: new Date(lastUpdated).toISOString(),
      last_active: new Date().toISOString(),
    })
    .eq("id", userId);

  return Response.json({
    matchId: match.id,
    energy,
    practiceCountToday: practiceToday,
    rested: tile.last_practiced_date === null || tile.last_practiced_date < today,
  });
});
