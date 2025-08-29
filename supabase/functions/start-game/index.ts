// What this file does: Start a new game with a random historical window and initial NAV.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "zod";
import { StartGameSchema } from "../_shared/types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization")!;
    const supa = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false }
    });

    const body = await req.json();
    const parsed = StartGameSchema.parse(body);

    // Current user
    const { data: userResp, error: uerr } = await supa.auth.getUser();
    if (uerr || !userResp.user) return new Response("Unauthorized", { status: 401 });
    const uid = userResp.user.id;

    // Ensure profile
    await supa.from("profiles").upsert({ id: uid }).select().single();

    // Pick season
    let seasonId = parsed.seasonId;
    if (!seasonId) {
      const { data: season } = await supa.from("seasons").select("*").limit(1).single();
      if (!season) return new Response("No season", { status: 400 });
      seasonId = season.id;
    }
    const { data: season } = await supa.from("seasons").select("*").eq("id", seasonId).single();

    // Random start within [min_date, max_date - max_turns]
    const min = new Date(season.min_date + "T00:00:00Z").getTime();
    const max = new Date(season.max_date + "T00:00:00Z").getTime();
    const span = max - min - season.max_turns * season.turn_length_days * 86400_000;
    const startMs = min + Math.floor(Math.random() * Math.max(1, span));
    const startDate = new Date(startMs);
    const endDate = new Date(startMs + season.max_turns * season.turn_length_days * 86400_000);
    const iso = (d: Date) => d.toISOString().slice(0,10);

    // Create game
    const { data: game, error: gerr } = await supa.from("games").insert({
      user_id: uid,
      season_id: season.id,
      start_cash: 10000,
      start_date: iso(startDate),
      end_date: iso(endDate),
      current_turn: 0,
      status: "active"
    }).select().single();
    if (gerr) throw gerr;

    // Turn 0
    await supa.from("turns").insert({
      game_id: game.id,
      turn_index: 0,
      as_of_date: iso(startDate),
      nav: game.start_cash,
      cash: game.start_cash,
      weights: {}
    });

    return new Response(JSON.stringify({ gameId: game.id, startDate: game.start_date, endDate: game.end_date }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
