// What this file does: Finalize a game and write the leaderboard row.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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

    const { gameId } = await req.json();

    const { data: user } = await supa.auth.getUser();
    if (!user?.user) return new Response("Unauthorized", { status: 401 });
    const uid = user.user.id;

    const { data: game } = await supa.from("games").select("*").eq("id", gameId).single();
    if (!game || game.user_id !== uid) return new Response("Not your game", { status: 403 });

    const { data: lastTurn } = await supa.from("turns")
      .select("*").eq("game_id", gameId).order("turn_index", { ascending: false }).limit(1).single();

    await supa.from("game_results").insert({
      game_id: gameId,
      user_id: uid,
      season_id: game.season_id,
      final_nav: lastTurn.nav,
      turns_played: lastTurn.turn_index
    });

    await supa.from("games").update({ status: "finished" }).eq("id", gameId);

    return new Response(JSON.stringify({ finalNav: lastTurn.nav }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
